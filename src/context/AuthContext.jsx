// src/context/AuthContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { STORAGE_KEYS, DEMO_CREDENTIALS } from '../constants';
import { genId } from '../utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

const loadUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) ?? '[]');
  } catch {
    return [];
  }
};

const saveUsers = (users) =>
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

const loadSession = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION));
  } catch {
    return null;
  }
};

const saveSession = (user) =>
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));

const clearSession = () =>
  localStorage.removeItem(STORAGE_KEYS.SESSION);

// Seed demo user once
const seedDemoUser = () => {
  const users = loadUsers();
  if (!users.find((u) => u.email === DEMO_CREDENTIALS.email)) {
    saveUsers([
      ...users,
      {
        id: 'DEMO01',
        name: DEMO_CREDENTIALS.name,
        email: DEMO_CREDENTIALS.email,
        password: DEMO_CREDENTIALS.password,
        role: DEMO_CREDENTIALS.role,
        createdAt: new Date().toISOString(),
      },
    ]);
  }
};

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  seedDemoUser();

  const [user, setUser] = useState(() => loadSession());

  /**
   * Sign in an existing user.
   * @param {{ email: string; password: string }} credentials
   * @throws {string}  Human-readable error message
   */
  const login = useCallback(({ email, password }) => {
    const users = loadUsers();
    const found = users.find(
      (u) => u.email === email.trim().toLowerCase() && u.password === password,
    );
    if (!found) throw new Error('Invalid email or password.');
    saveSession(found);
    setUser(found);
  }, []);

  /**
   * Create a new account and immediately sign in.
   * @param {{ name: string; email: string; password: string; role: string }} data
   * @throws {string}
   */
  const signup = useCallback(({ name, email, password, role }) => {
    const users = loadUsers();
    if (users.find((u) => u.email === email.trim().toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    const newUser = {
      id:        genId('USR'),
      name:      name.trim(),
      email:     email.trim().toLowerCase(),
      password,
      role,
      createdAt: new Date().toISOString(),
    };
    saveUsers([...users, newUser]);
    saveSession(newUser);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** @returns {{ user: object|null, login: Function, signup: Function, logout: Function }} */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
