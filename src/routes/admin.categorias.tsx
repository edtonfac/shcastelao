import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, LayoutGrid, GripVertical } from "lucide-react";

export const Route = createFileRoute("/admin/categorias")({
  head: () => ({ meta: [{ title: "Categorias — Admin" }] }),
  component: CategoriasPage,
});

type Categoria = { id: string; nome: string; ordem: number; created_at: string };

function CategoriasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [nome, setNome] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: cats, isLoading } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("*").order("ordem");
      if (error) throw error;
      return data as Categoria[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Nome obrigatório");
      if (editing) {
        const { error } = await supabase.from("categorias").update({ nome: nome.trim() }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const nextOrdem = (cats?.length ?? 0) + 1;
        const { error } = await supabase.from("categorias").insert({ nome: nome.trim(), ordem: nextOrdem });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categorias"] });
      toast.success(editing ? "Categoria atualizada!" : "Categoria criada!");
      setOpen(false);
      setEditing(null);
      setNome("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categorias"] });
      toast.success("Categoria excluída");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() { setEditing(null); setNome(""); setOpen(true); }
  function openEdit(cat: Categoria) { setEditing(cat); setNome(cat.nome); setOpen(true); }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorias</h1>
          <p className="text-sm text-muted-foreground">Organize seu cardápio em seções</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Nova categoria</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : !cats?.length ? (
        <EmptyState icon={<LayoutGrid className="h-10 w-10" />} title="Nenhuma categoria"
          description="Crie categorias para organizar seu cardápio" action={<Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Criar primeira categoria</Button>} />
      ) : (
        <div className="space-y-2">
          {cats.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition hover:border-primary/30">
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <span className="flex-1 font-medium">{cat.nome}</span>
              <span className="text-xs text-muted-foreground">Ordem {cat.ordem}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(cat)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteId(cat.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setNome(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nome da categoria</Label>
              <Input
                placeholder="Ex: Hambúrgueres"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save.mutate()}
                autoFocus
              />
            </div>
            <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Salvando..." : editing ? "Salvar alterações" : "Criar categoria"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir categoria?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita. Os produtos desta categoria ficarão sem categoria.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={() => remove.mutate(deleteId!)} disabled={remove.isPending}>
              {remove.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card p-12 text-center">
      <div className="text-muted-foreground/40">{icon}</div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export { EmptyState };
