import type { ChatMessage } from "@/types";
import { Bot, User } from "lucide-react";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? "bg-purple-500/20 text-purple-400"
            : "bg-blue-500/20 text-blue-400"
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-[var(--primary)] text-white rounded-tr-sm"
            : "bg-[var(--secondary)] text-[var(--foreground)] rounded-tl-sm"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p
          className={`text-[10px] mt-1 ${
            isUser ? "text-purple-200" : "text-[var(--muted-foreground)]"
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString("pt-BR")}
        </p>
      </div>
    </div>
  );
}
