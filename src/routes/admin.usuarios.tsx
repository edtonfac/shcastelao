import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Shield, User, RefreshCw, Search } from "lucide-react";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({ meta: [{ title: "Gerenciar Equipe | Admin" }] }),
  component: EquipePage,
});

interface UserProfile {
  id: string;
  nome: string | null;
  created_at: string;
  user_roles: {
    id: string;
    role: "admin" | "cozinha" | "garcom";
  }[];
}

function EquipePage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch profiles with their roles
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["profiles-roles"],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("id, nome, created_at");

      if (pError) throw pError;

      // Fetch user_roles
      const { data: roles, error: rError } = await supabase
        .from("user_roles")
        .select("id, user_id, role");

      if (rError) throw rError;

      // Map roles to profiles
      return (profiles || []).map((profile) => ({
        ...profile,
        user_roles: (roles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => ({ id: r.id, role: r.role })),
      })) as UserProfile[];
    },
  });

  // Role update mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: "admin" | "cozinha" | "garcom" | "nenhum" }) => {
      // First delete any existing roles for this user
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // If we are setting a new role, insert it
      if (newRole !== "nenhum") {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: newRole,
          });

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles-roles"] });
      toast.success("Role do usuário atualizada!");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar permissão: " + err.message);
    },
  });

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({
      userId,
      newRole: newRole as "admin" | "cozinha" | "garcom" | "nenhum",
    });
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400 border-red-200";
      case "cozinha":
        return "bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200";
      case "garcom":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-200";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-950/30 dark:text-slate-400 border-slate-200";
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "cozinha":
        return "Cozinha";
      case "garcom":
        return "Garçom";
      default:
        return "Sem Acesso (Cliente)";
    }
  };

  const filteredUsers = users.filter((u) => {
    const nome = u.nome?.toLowerCase() || "";
    const roleLabel = getRoleLabel(u.user_roles[0]?.role).toLowerCase();
    const term = searchTerm.toLowerCase();
    return nome.includes(term) || roleLabel.includes(term) || u.id.includes(term);
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Equipe & Acessos</h1>
          <p className="text-muted-foreground">
            Defina quem tem acesso ao painel de Cozinha, Garçom ou Administrativo.
          </p>
        </div>
        <div>
          <Button onClick={() => refetch()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Membros Cadastrados</CardTitle>
              <CardDescription>
                Exibindo {filteredUsers.length} usuários. Mude os papéis para conceder permissões operacionais.
              </CardDescription>
            </div>
            <div className="relative w-full max-w-sm sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-center text-muted-foreground">
              Nenhum usuário cadastrado ou encontrado.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membro</TableHead>
                    <TableHead className="hidden md:table-cell">ID do Usuário</TableHead>
                    <TableHead>Cargo Atual</TableHead>
                    <TableHead className="w-52 text-right">Alterar Acesso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const currentRole = user.user_roles[0]?.role || "nenhum";
                    return (
                      <TableRow key={user.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              <User className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold">{user.nome || "Usuário Sem Nome"}</p>
                              <p className="text-xs text-muted-foreground">
                                Cadastrado em {new Date(user.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground hidden md:table-cell">
                          {user.id}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getRoleBadgeColor(currentRole)}>
                            <Shield className="mr-1 h-3.5 w-3.5" />
                            {getRoleLabel(currentRole)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Select
                            value={currentRole}
                            onValueChange={(val) => handleRoleChange(user.id, val)}
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger className="w-[180px] ml-auto">
                              <SelectValue placeholder="Escolha um cargo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nenhum">Sem Acesso (Cliente)</SelectItem>
                              <SelectItem value="garcom">Garçom</SelectItem>
                              <SelectItem value="cozinha">Cozinha</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
