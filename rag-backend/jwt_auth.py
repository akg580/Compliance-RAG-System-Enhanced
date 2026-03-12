"""
JWT auth routes and helpers.

NOTE: This file is a placeholder to satisfy repo structure. Wire it into main.py
once you finalize auth flows.
"""
from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/health")
def auth_health():
    return {"status": "ok"}
