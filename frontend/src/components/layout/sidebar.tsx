"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageCircle,
  History,
  Settings,
  Activity,
  Instagram,
  Shield,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/chat", label: "Chat", icon: MessageCircle },
    { href: "/conversations", label: "Conversas", icon: History },
    { href: "/monitor", label: "Monitor", icon: Activity },
    { href: "/settings", label: "Configuracoes", icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-[var(--card)] border-r border-[var(--border)] flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Instagram className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">InstaAgent</h1>
            <p className="text-xs text-[var(--muted-foreground)]">AI Monitor</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--secondary-foreground)] hover:bg-[var(--secondary)] hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* Admin link - only for admins */}
        {user?.is_admin && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              pathname === "/admin"
                ? "bg-[var(--primary)] text-white"
                : "text-yellow-400/70 hover:bg-[var(--secondary)] hover:text-yellow-400"
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-sm font-medium">Admin</span>
          </Link>
        )}
      </nav>

      {/* User info + Logout */}
      <div className="p-4 border-t border-[var(--border)] space-y-3">
        {user && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--secondary)] flex items-center justify-center">
              <User className="w-4 h-4 text-[var(--muted-foreground)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.name || user.email}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] truncate">
                {user.email}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
