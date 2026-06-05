import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/components/AuthProvider";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shalom Castelão — Pedidos por QR Code" },
      { name: "description", content: "Sistema profissional de pedidos por mesa para Shalom Castelão." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary/20 via-background to-background px-6 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,oklch(0.74_0.13_217/0.25),transparent_50%)]" />
        <Logo size={120} className="shadow-xl" />
        <h1 className="mt-8 text-4xl font-bold tracking-tight">Shalom Castelão</h1>
        <p className="mt-3 max-w-sm text-muted-foreground">
          Sistema de pedidos por QR Code. Os clientes acessam o cardápio escaneando o código da mesa.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="/auth" className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90">
            Entrar na operação
          </a>
        </div>
        <p className="mt-10 text-xs text-muted-foreground">Clientes não precisam de login — basta escanear o QR Code da mesa.</p>
      </div>
    );
  }

  if (roles.includes("admin")) return <Navigate to="/admin" />;
  if (roles.includes("cozinha")) return <Navigate to="/cozinha" />;
  if (roles.includes("garcom")) return <Navigate to="/garcom" />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="max-w-sm">
        <Logo size={80} />
        <h1 className="mt-6 text-2xl font-semibold">Conta sem permissão</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu usuário não possui função atribuída. Peça ao administrador para liberar seu acesso.
        </p>
        <a href="/auth" className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-input bg-background px-6 text-sm font-medium">
          Sair
        </a>
      </div>
    </div>
  );
}
