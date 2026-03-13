"""
JWT Authentication — ComplianceAI  v1
======================================
Endpoints mounted at /auth/*:
  POST /auth/signup   → register, get tokens
  POST /auth/login    → get tokens
  POST /auth/refresh  → rotate refresh token
  POST /auth/logout   → revoke refresh token
  GET  /auth/me       → current user profile

Token flow:
  access_token  — 30-min JWT, sent as Bearer header on every /api/* call
  refresh_token — 7-day JWT, used only to get a new access token

User role comes from the SIGNED token → cannot be spoofed from the frontend.

Storage: users.json (single-file, no DB needed for prototype/free tier).
Production path: swap _load_users/_save_users for PostgreSQL/Supabase.

No external JWT library — uses stdlib hmac + hashlib (zero extra deps).
bcrypt is used if installed (pip install bcrypt); falls back to sha-256 + salt.
"""

import base64, hashlib, hmac, json, os, secrets, time
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

# ── Configuration ─────────────────────────────────────────────────────────────
# Set JWT_SECRET in your .env — if missing, a random secret is generated per
# process restart (all tokens invalidated on redeploy — acceptable for free tier).
JWT_SECRET       = os.getenv("JWT_SECRET", secrets.token_hex(32))
ACCESS_EXPIRE_M  = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_EXPIRE_D = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS",  "7"))

ALLOWED_ROLES = {
    "Junior Officer",
    "Senior Loan Officer",
    "Credit Manager",
    "Risk Officer",
    "Senior Management",
}

# ── Password hashing ──────────────────────────────────────────────────────────
try:
    import bcrypt as _bcrypt
    def _hash_pw(pw: str) -> str:
        return _bcrypt.hashpw(pw.encode(), _bcrypt.gensalt(12)).decode()
    def _check_pw(pw: str, hashed: str) -> bool:
        return _bcrypt.checkpw(pw.encode(), hashed.encode())
except ImportError:
    # bcrypt not installed — use sha-256 + random salt (fine for prototype)
    def _hash_pw(pw: str) -> str:
        salt = secrets.token_hex(16)
        h    = hashlib.sha256(f"{salt}:{pw}".encode()).hexdigest()
        return f"sha256${salt}${h}"
    def _check_pw(pw: str, hashed: str) -> bool:
        try:
            _, salt, h = hashed.split("$", 2)
            return hashlib.sha256(f"{salt}:{pw}".encode()).hexdigest() == h
        except Exception:
            return False

# ── Minimal JWT (no PyJWT needed) ────────────────────────────────────────────
def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _b64url_decode(s: str) -> bytes:
    pad = 4 - len(s) % 4
    return base64.urlsafe_b64decode(s + "=" * (pad % 4))

def _jwt_create(payload: dict) -> str:
    header  = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body    = _b64url_encode(json.dumps(payload).encode())
    msg     = f"{header}.{body}".encode()
    sig     = _b64url_encode(hmac.new(JWT_SECRET.encode(), msg, hashlib.sha256).digest())
    return f"{header}.{body}.{sig}"

def _jwt_decode(token: str) -> dict:
    """Verify signature + expiry, return payload dict or raise HTTP 401."""
    try:
        header, body, sig = token.split(".")
    except ValueError:
        raise HTTPException(401, "Malformed token.")
    msg      = f"{header}.{body}".encode()
    expected = _b64url_encode(hmac.new(JWT_SECRET.encode(), msg, hashlib.sha256).digest())
    if not hmac.compare_digest(sig, expected):
        raise HTTPException(401, "Invalid token signature.")
    try:
        payload = json.loads(_b64url_decode(body))
    except Exception:
        raise HTTPException(401, "Token decode error.")
    if payload.get("exp", 0) < time.time():
        raise HTTPException(401, "Token expired. Please log in again.")
    return payload

def make_access_token(uid: str, email: str, role: str) -> str:
    return _jwt_create({
        "sub":   uid,
        "email": email,
        "role":  role,
        "type":  "access",
        "iat":   int(time.time()),
        "exp":   int(time.time()) + ACCESS_EXPIRE_M * 60,
    })

def make_refresh_token(uid: str) -> str:
    return _jwt_create({
        "sub":  uid,
        "type": "refresh",
        "jti":  secrets.token_hex(12),   # unique ID — stored in DB for revocation
        "iat":  int(time.time()),
        "exp":  int(time.time()) + REFRESH_EXPIRE_D * 86400,
    })

# ── User store (JSON file) ────────────────────────────────────────────────────
USERS_FILE = Path(os.getenv("USERS_FILE", "users.json"))

def _load() -> dict:
    if USERS_FILE.exists():
        try:
            return json.loads(USERS_FILE.read_text("utf-8"))
        except Exception:
            pass
    return {}

def _save(users: dict) -> None:
    tmp = USERS_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(users, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(USERS_FILE)   # atomic rename

def _by_email(email: str) -> Optional[dict]:
    return next((u for u in _load().values() if u["email"] == email.lower()), None)

def _by_id(uid: str) -> Optional[dict]:
    return _load().get(uid)

# ── Pydantic schemas ──────────────────────────────────────────────────────────
class SignupIn(BaseModel):
    full_name: str = Field(..., min_length=2,  max_length=80)
    email:     str = Field(..., min_length=5,  max_length=120)
    password:  str = Field(..., min_length=8,  max_length=128)
    role:      str = Field(default="Junior Officer")

class LoginIn(BaseModel):
    email:    str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)

class RefreshIn(BaseModel):
    refresh_token: str

class TokenOut(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str  = "bearer"
    expires_in:    int           # seconds until access token expires
    user:          dict

# ── Router ────────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup", response_model=TokenOut, status_code=201,
             summary="Create account")
def signup(body: SignupIn):
    # Validate role
    if body.role not in ALLOWED_ROLES:
        raise HTTPException(400, f"Invalid role. Choose from: {', '.join(sorted(ALLOWED_ROLES))}")

    email = body.email.strip().lower()
    if _by_email(email):
        raise HTTPException(409, "An account with this email already exists.")

    uid   = f"usr_{secrets.token_hex(8)}"
    now   = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    user  = {
        "id":            uid,
        "full_name":     body.full_name.strip(),
        "email":         email,
        "password_hash": _hash_pw(body.password),
        "role":          body.role,
        "created_at":    now,
        "refresh_token": None,
        "active":        True,
    }
    users     = _load()
    users[uid] = user

    # Issue tokens
    access  = make_access_token(uid, email, body.role)
    refresh = make_refresh_token(uid)
    users[uid]["refresh_token"] = refresh
    _save(users)

    return TokenOut(
        access_token=access, refresh_token=refresh,
        expires_in=ACCESS_EXPIRE_M * 60,
        user={"id": uid, "full_name": user["full_name"],
              "email": email,  "role": body.role},
    )

@router.post("/login", response_model=TokenOut, summary="Sign in")
def login(body: LoginIn):
    user = _by_email(body.email.strip().lower())
    if not user or not _check_pw(body.password, user["password_hash"]):
        raise HTTPException(401, "Incorrect email or password.")
    if not user.get("active", True):
        raise HTTPException(403, "Account disabled. Contact an administrator.")

    access  = make_access_token(user["id"], user["email"], user["role"])
    refresh = make_refresh_token(user["id"])

    users = _load()
    users[user["id"]]["refresh_token"] = refresh
    _save(users)

    return TokenOut(
        access_token=access, refresh_token=refresh,
        expires_in=ACCESS_EXPIRE_M * 60,
        user={"id": user["id"], "full_name": user["full_name"],
              "email": user["email"], "role": user["role"]},
    )

@router.post("/refresh", response_model=TokenOut, summary="Rotate tokens")
def refresh(body: RefreshIn):
    payload = _jwt_decode(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Not a refresh token.")
    uid  = payload["sub"]
    user = _by_id(uid)
    if not user or user.get("refresh_token") != body.refresh_token:
        raise HTTPException(401, "Refresh token revoked or already used.")

    access      = make_access_token(uid, user["email"], user["role"])
    new_refresh = make_refresh_token(uid)

    users = _load()
    users[uid]["refresh_token"] = new_refresh
    _save(users)

    return TokenOut(
        access_token=access, refresh_token=new_refresh,
        expires_in=ACCESS_EXPIRE_M * 60,
        user={"id": uid, "full_name": user["full_name"],
              "email": user["email"], "role": user["role"]},
    )

@router.post("/logout", status_code=204, summary="Sign out")
def logout(body: RefreshIn):
    """Invalidates refresh token. Access token expires naturally in 30 min."""
    try:
        payload = _jwt_decode(body.refresh_token)
        uid     = payload.get("sub", "")
        users   = _load()
        if uid in users:
            users[uid]["refresh_token"] = None
            _save(users)
    except Exception:
        pass   # always succeed — idempotent logout

@router.get("/me", summary="Current user profile")
def me(creds: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))):
    user = _require_user(creds)
    return {
        "id":         user["id"],
        "full_name":  user["full_name"],
        "email":      user["email"],
        "role":       user["role"],
        "created_at": user["created_at"],
    }

@router.get("/users", summary="List all users — Senior Management only")
def list_users(creds: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))):
    user = _require_user(creds)
    if user["role"] != "Senior Management":
        raise HTTPException(403, "Senior Management access required.")
    return [
        {"id": u["id"], "full_name": u["full_name"], "email": u["email"],
         "role": u["role"], "created_at": u["created_at"], "active": u.get("active", True)}
        for u in _load().values()
    ]

# ── Dependency injected into every /api/* route ───────────────────────────────
_bearer_scheme = HTTPBearer(auto_error=False)

def _require_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(401, "Missing Authorization: Bearer <token> header.")
    payload = _jwt_decode(creds.credentials)
    if payload.get("type") != "access":
        raise HTTPException(401, "Not an access token.")
    user = _by_id(payload["sub"])
    if not user or not user.get("active", True):
        raise HTTPException(401, "User account not found or disabled.")
    return user

# Alias used in main.py: `from jwt_auth import require_user`
require_user = _require_user