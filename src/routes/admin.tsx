import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/components/AuthProvider";
import { AdminLayout } from "@/components/AdminLayout";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminRoute,
});

function AdminRoute() {
  const { user, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" />;
  if (!roles.includes("admin")) return <Navigate to="/" />;

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
