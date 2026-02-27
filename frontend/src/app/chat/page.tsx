import { Header } from "@/components/layout/header";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <div className="h-screen flex flex-col">
      <Header title="Chat com Agente" />
      <ChatInterface />
    </div>
  );
}
