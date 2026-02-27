"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { api } from "@/lib/api";

export function Header({ title }: { title: string }) {
  const [monitorRunning, setMonitorRunning] = useState(false);

  useEffect(() => {
    api.getMonitorStatus()
      .then((status) => setMonitorRunning(status.running))
      .catch(() => {});
  }, []);

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between px-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            monitorRunning ? "bg-[var(--success)] animate-pulse" : "bg-[var(--muted-foreground)]"
          }`}
        />
        <span className="text-sm text-[var(--secondary-foreground)]">
          <Activity className="w-4 h-4 inline mr-1" />
          Monitor {monitorRunning ? "Ativo" : "Parado"}
        </span>
      </div>
    </header>
  );
}
