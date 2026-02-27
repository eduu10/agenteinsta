"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { api } from "@/lib/api";
import type { ConversationItem } from "@/types";
import { MessageCircle, Heart, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";

const eventTypeLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  new_follower: { label: "Novo Seguidor", color: "text-green-400 bg-green-400/10", icon: <UserPlus className="w-3 h-3" /> },
  photo_like: { label: "Curtida", color: "text-pink-400 bg-pink-400/10", icon: <Heart className="w-3 h-3" /> },
};

const actionLabels: Record<string, string> = {
  sent_dm: "DM Enviado",
  posted_comment: "Comentario",
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string>("");
  const [selectedConv, setSelectedConv] = useState<ConversationItem | null>(null);
  const limit = 15;

  useEffect(() => {
    async function loadConversations() {
      try {
        const data = await api.getConversations(page, limit, filter || undefined);
        setConversations(data.items);
        setTotal(data.total);
      } catch {
        // Backend not reachable
      }
    }
    loadConversations();
  }, [page, filter, limit]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <Header title="Conversas Automaticas" />
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setFilter(""); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              !filter ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:text-white"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => { setFilter("new_follower"); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === "new_follower" ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:text-white"
            }`}
          >
            Novos Seguidores
          </button>
          <button
            onClick={() => { setFilter("photo_like"); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === "photo_like" ? "bg-[var(--primary)] text-white" : "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:text-white"
            }`}
          >
            Curtidas
          </button>
          <span className="text-sm text-[var(--muted-foreground)] ml-auto">
            {total} conversas
          </span>
        </div>

        {/* Table */}
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden">
          {conversations.length === 0 ? (
            <div className="p-12 text-center">
              <MessageCircle className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-3" />
              <p className="text-[var(--muted-foreground)]">
                Nenhuma conversa automatica ainda.
              </p>
              <p className="text-[var(--muted-foreground)] text-sm mt-1">
                Inicie o monitor para comecar a detectar interacoes.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left p-4 text-xs text-[var(--muted-foreground)] font-medium uppercase">Usuario</th>
                  <th className="text-left p-4 text-xs text-[var(--muted-foreground)] font-medium uppercase">Evento</th>
                  <th className="text-left p-4 text-xs text-[var(--muted-foreground)] font-medium uppercase">Acao</th>
                  <th className="text-left p-4 text-xs text-[var(--muted-foreground)] font-medium uppercase">Mensagem</th>
                  <th className="text-left p-4 text-xs text-[var(--muted-foreground)] font-medium uppercase">Data</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conv) => {
                  const et = eventTypeLabels[conv.event_type] || { label: conv.event_type, color: "text-gray-400 bg-gray-400/10", icon: null };
                  return (
                    <tr
                      key={conv.id}
                      onClick={() => setSelectedConv(conv)}
                      className="border-b border-[var(--border)] hover:bg-[var(--secondary)] cursor-pointer transition-colors"
                    >
                      <td className="p-4">
                        <span className="text-sm text-white font-medium">
                          @{conv.instagram_username || conv.instagram_user_id}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${et.color}`}>
                          {et.icon}
                          {et.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-[var(--secondary-foreground)]">
                          {actionLabels[conv.agent_action] || conv.agent_action}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="text-sm text-[var(--secondary-foreground)] truncate">
                          {conv.agent_message}
                        </p>
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                          {new Date(conv.created_at).toLocaleString("pt-BR")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] disabled:opacity-30 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-[var(--muted-foreground)]">
              Pagina {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] disabled:opacity-30 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Detail Modal */}
        {selectedConv && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedConv(null)}>
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white mb-4">Detalhes da Conversa</h3>
              <div className="space-y-3">
                <Field label="Usuario" value={`@${selectedConv.instagram_username || selectedConv.instagram_user_id}`} />
                <Field label="Evento" value={eventTypeLabels[selectedConv.event_type]?.label || selectedConv.event_type} />
                <Field label="Acao" value={actionLabels[selectedConv.agent_action] || selectedConv.agent_action} />
                <Field label="Mensagem do Agente" value={selectedConv.agent_message} />
                {selectedConv.trigger_media_caption && (
                  <Field label="Legenda da Midia" value={selectedConv.trigger_media_caption} />
                )}
                <Field label="Data" value={new Date(selectedConv.created_at).toLocaleString("pt-BR")} />
              </div>
              <button
                onClick={() => setSelectedConv(null)}
                className="mt-6 w-full py-2 rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:text-white transition-colors text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}
