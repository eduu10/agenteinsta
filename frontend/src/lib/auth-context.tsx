"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, clearToken } from "@/lib/api";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      setLoading(false);
      if (pathname !== "/auth") {
        router.push("/auth");
      }
      return;
    }

    api.getMe()
      .then((data) => {
        setUser(data);
        setLoading(false);
        if (pathname === "/auth") {
          router.push("/");
        }
      })
      .catch(() => {
        clearToken();
        setLoading(false);
        if (pathname !== "/auth") {
          router.push("/auth");
        }
      });
  }, [pathname, router]);

  function logout() {
    clearToken();
    setUser(null);
    router.push("/auth");
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
