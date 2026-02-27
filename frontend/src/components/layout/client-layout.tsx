"use client";

import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Loader2 } from "lucide-react";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Auth page gets no sidebar
  if (pathname === "/auth") {
    return <>{children}</>;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <>{children}</>;
  }

  // Authenticated - show sidebar + content
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64">{children}</main>
    </div>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  );
}
