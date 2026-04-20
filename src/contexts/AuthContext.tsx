"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api } from "@/lib/api";

export type Role = "principal" | "vice" | "counselor" | "teacher";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface LoginResponse {
  token: string;
  role: Role;
  owner_id: number;
  user: AuthUser;
}

interface MeResponse {
  role: Role;
  owner_id: number;
  user: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  role: Role | null;
  ownerId: number | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("smos_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api<MeResponse>("/me")
      .then((data) => {
        setUser(data.user);
        setRole(data.role);
        setOwnerId(data.owner_id);
      })
      .catch(() => {
        localStorage.removeItem("smos_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api<LoginResponse>("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("smos_token", data.token);
    setUser(data.user);
    setRole(data.role);
    setOwnerId(data.owner_id);
  };

  const logout = async () => {
    // Clear local state first so UI reflects logged-out immediately.
    // Backend deletion is best-effort (ignore failures — token will expire eventually).
    const hadToken = localStorage.getItem("smos_token");
    localStorage.removeItem("smos_token");
    setUser(null);
    setRole(null);
    setOwnerId(null);

    if (hadToken) {
      try {
        // Re-attach the token manually since we already removed it from storage
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${hadToken}`,
          },
        });
      } catch {
        // Ignore network errors — local state already cleared
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, role, ownerId, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
