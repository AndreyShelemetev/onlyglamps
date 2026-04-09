"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface AuthUser {
  id: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  email: string | null;
  role: string;
  hasOwnerProfile: boolean;
  bio: string | null;
  vkUrl: string | null;
  telegramUrl: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => ({ ok: false }),
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async (jwt: string) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setToken(jwt);
      } else {
        localStorage.removeItem("og_token");
        setUser(null);
        setToken(null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("og_token");
    if (saved) {
      fetchMe(saved).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "Ошибка входа" };
      localStorage.setItem("og_token", data.token);
      setToken(data.token);
      setUser(data.user);
      return { ok: true };
    } catch {
      return { ok: false, error: "Ошибка сети" };
    }
  };

  const logout = () => {
    localStorage.removeItem("og_token");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
