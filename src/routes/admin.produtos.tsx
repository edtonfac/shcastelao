import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Package, Search, ImageIcon } from "lucide-react";
import { formatBRL } from "@/lib/cart";

export const Route = createFileRoute("/admin/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Admin" }] }),
  component: ProdutosPage,
});

type Produto = {
  id: string; nome: string; descricao: string | null;
  preco: number; foto_url: string | null; ingredientes: string | null;
  ativo: boolean; categoria_id: string | null; permite_observacao: boolean; created_at: string;
};
type Categoria = { id: string; nome: string; ordem: number };

const EMPTY_FORM = {
  nome: "", descricao: "", preco: "", foto_url: "", ingredientes: "",
  ativo: true, categoria_id: "", permite_observacao: true,
};

function ProdutosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [filterAtivo, setFilterAtivo] = useState<"todos" | "ativo" | "inativo">("todos");

  const { data: cats } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data } = await supabase.from("categorias").select("*").order("ordem");
      return (data ?? []) as Categoria[];
    },
  });

  const { data: produtos, isLoading } = useQuery({
    queryKey: ["produtos-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("*").order("nome");
      if (error) throw error;
      return (data ?? []) as Produto[];
    },
  });

  const filtered = (produtos ?? []).filter((p) => {
    const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase());
    const matchAtivo =
      filterAtivo === "todos" ? true : filterAtivo === "ativo" ? p.ativo : !p.ativo;
    return matchSearch && matchAtivo;
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Nome obrigatório");
      const preco = parseFloat(String(form.preco).replace(",", "."));
      if (isNaN(preco) || preco < 0) throw new Error("Preço inválido");
      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao || null,
        preco,
        foto_url: form.foto_url || null,
        ingredientes: form.ingredientes || null,
        ativo: form.ativo,
        categoria_id: form.categoria_id || null,
        permite_observacao: form.permite_observacao,
      };
      if (editing) {
        const { error } = await supabase.from("produtos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("produtos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos-admin"] });
      qc.invalidateQueries({ queryKey: ["menu"] });
      toast.success(editing ? "Produto atualizado!" : "Produto criado!");
      handleClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("produtos").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["produtos-admin"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, categoria_id: cats?.[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(p: Produto) {
    setEditing(p);
    setForm({
      nome: p.nome, descricao: p.descricao ?? "", preco: String(p.preco),
      foto_url: p.foto_url ?? "", ingredientes: p.ingredientes ?? "",
      ativo: p.ativo, categoria_id: p.categoria_id ?? "",
      permite_observacao: p.permite_observacao,
    });
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-sm text-muted-foreground">{produtos?.length ?? 0} produtos cadastrados</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Novo produto</Button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar produto..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex rounded-lg border bg-card overflow-hidden">
          {(["todos", "ativo", "inativo"] as const).map((f) => (
            <button key={f} onClick={() => setFilterAtivo(f)}
              className={`px-3 py-2 text-xs font-medium capitalize transition ${filterAtivo === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : !filtered.length ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-semibold">Nenhum produto encontrado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search ? "Tente outra busca" : "Clique em 'Novo produto' para começar"}
            </p>
          </div>
          {!search && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Criar primeiro produto</Button>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const catNome = cats?.find((c) => c.id === p.categoria_id)?.nome;
            return (
              <div key={p.id} className={`group relative rounded-2xl border bg-card overflow-hidden transition ${!p.ativo ? "opacity-60" : ""}`}>
                {/* Image */}
                <div className="h-36 bg-muted flex items-center justify-center overflow-hidden">
                  {p.foto_url ? (
                    <img src={p.foto_url} alt={p.nome} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                  )}
                </div>
                {/* Body */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.nome}</p>
                      {catNome && <p className="text-xs text-muted-foreground">{catNome}</p>}
                    </div>
                    <span className="shrink-0 font-bold text-primary">{formatBRL(Number(p.preco))}</span>
                  </div>
                  {p.descricao && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.descricao}</p>}
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between border-t px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={p.ativo}
                      onCheckedChange={(v) => toggleAtivo.mutate({ id: p.id, ativo: v })}
                      id={`ativo-${p.id}`}
                    />
                    <Label htmlFor={`ativo-${p.id}`} className="text-xs cursor-pointer">
                      {p.ativo ? "Disponível" : "Indisponível"}
                    </Label>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: X-Burguer Especial" value={form.nome} onChange={(e) => set("nome", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Preço (R$) *</Label>
                <Input placeholder="29,90" value={form.preco} onChange={(e) => set("preco", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.categoria_id} onChange={(e) => set("categoria_id", e.target.value)}>
                  <option value="">Sem categoria</option>
                  {cats?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea placeholder="Descreva o produto..." rows={2} value={form.descricao}
                onChange={(e) => set("descricao", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Ingredientes</Label>
              <Input placeholder="Pão, carne, queijo, alface, tomate..." value={form.ingredientes}
                onChange={(e) => set("ingredientes", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>URL da foto</Label>
              <Input placeholder="https://..." value={form.foto_url}
                onChange={(e) => set("foto_url", e.target.value)} />
              {form.foto_url && (
                <img src={form.foto_url} alt="preview" className="mt-2 h-32 w-full rounded-xl object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Disponível no cardápio</p>
                <p className="text-xs text-muted-foreground">Clientes podem visualizar e pedir</p>
              </div>
              <Switch checked={form.ativo} onCheckedChange={(v) => set("ativo", v)} />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Permite observações</p>
                <p className="text-xs text-muted-foreground">Ex: "sem cebola", "molho separado"</p>
              </div>
              <Switch checked={form.permite_observacao} onCheckedChange={(v) => set("permite_observacao", v)} />
            </div>
            <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Salvando..." : editing ? "Salvar alterações" : "Criar produto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
