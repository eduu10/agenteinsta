import type { Metadata } from "next";
import "./globals.css";
import { ClientLayout } from "@/components/layout/client-layout";

export const metadata: Metadata = {
  title: "InstaAgent - AI Instagram Monitor",
  description: "Dashboard para o agente de IA que monitora seu Instagram",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
