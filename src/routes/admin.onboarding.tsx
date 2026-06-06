import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import {
  Building2, LayoutGrid, Package, Table2,
  CheckCircle2, ArrowRight, ArrowLeft, Loader2, Plus, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/onboarding")({
  head: () => ({ meta: [{ title: "Configuração Inicial" }] }),
  component: OnboardingPage,
});

const STEPS = [
  { id: 1, label: "Estabelecimento", icon: Building2 },
  { id: 2, label: "Categorias", icon: LayoutGrid },
  { id: 3, label: "Produtos", icon: Package },
  { id: 4, label: "Mesas", icon: Table2 },
  { id: 5, label: "Finalizar", icon: CheckCircle2 },
];

function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  // Step 1 — Estabelecimento
  const [estabForm, setEstabForm] = useState({ nome: "", whatsapp: "", endereco: "", horario: "", logo_url: "" });

  // Step 2 — Categorias
  const [categorias, setCategorias] = useState<string[]>([""]);

  // Step 3 — Produtos (simplified)
  const [produtos, setProdutos] = useState<{ nome: string; preco: string; categoriaIdx: number; descricao: string }[]>([
    { nome: "", preco: "", categoriaIdx: 0, descricao: "" },
  ]);

  // Step 4 — Mesas
  const [mesas, setMesas] = useState<string[]>(["1"]);

  async function saveEstab() {
    if (!estabForm.nome.trim()) { toast.error("Informe o nome do estabelecimento"); return false; }
    setLoading(true);
    const { error } = await supabase.from("estabelecimento").upsert({
      id: 1, nome: estabForm.nome, logo_url: estabForm.logo_url || null,
      updated_at: new Date().toISOString(),
    });
    setLoading(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return false; }
    return true;
  }

  async function saveCategorias() {
    const valid = categorias.filter((c) => c.trim());
    if (!valid.length) { toast.error("Adicione ao menos uma categoria"); return false; }
    setLoading(true);
    const rows = valid.map((nome, i) => ({ nome, ordem: i + 1 }));
    const { error } = await supabase.from("categorias").insert(rows);
    setLoading(false);
    if (error) { toast.error("Erro: " + error.message); return false; }
    return true;
  }

  async function saveProdutos() {
    const valid = produtos.filter((p) => p.nome.trim() && p.preco);
    if (!valid.length) { setStep(4); return true; } // opcional
    setLoading(true);
    // fetch categoria ids
    const { data: cats } = await supabase.from("categorias").select("id, nome").order("ordem");
    const rows = valid.map((p) => ({
      nome: p.nome,
      descricao: p.descricao || null,
      preco: parseFloat(p.preco.replace(",", ".")) || 0,
      categoria_id: cats?.[p.categoriaIdx]?.id ?? null,
      ativo: true,
    }));
    const { error } = await supabase.from("produtos").insert(rows);
    setLoading(false);
    if (error) { toast.error("Erro: " + error.message); return false; }
    return true;
  }

  async function saveMesas() {
    const valid = mesas.filter((m) => m.trim() && !isNaN(Number(m)));
    if (!valid.length) { toast.error("Adicione ao menos uma mesa"); return false; }
    setLoading(true);
    const rows = valid.map((n) => ({ numero: parseInt(n), qr_token: crypto.randomUUID() }));
    const { error } = await supabase.from("mesas").insert(rows);
    setLoading(false);
    if (error && !error.message.includes("duplicate")) { toast.error("Erro: " + error.message); return false; }
    return true;
  }

  async function finish() {
    setLoading(true);
    await supabase.from("estabelecimento").update({ onboarding_concluido: true } as any).eq("id", 1);
    setLoading(false);
    toast.success("Configuração concluída! Bem-vindo ao sistema 🎉");
    nav({ to: "/admin" });
  }

  async function handleNext() {
    let ok = true;
    if (step === 1) ok = await saveEstab();
    else if (step === 2) ok = await saveCategorias();
    else if (step === 3) ok = await saveProdutos();
    else if (step === 4) ok = await saveMesas();
    else if (step === 5) { await finish(); return; }
    if (ok && step < 5) setStep((s) => s + 1);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={56} />
          <h1 className="mt-4 text-2xl font-bold">Configuração Inicial</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vamos configurar o seu estabelecimento em 5 etapas rápidas</p>
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-between">
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    done ? "border-primary bg-primary text-primary-foreground" :
                    active ? "border-primary bg-primary/10 text-primary" :
                    "border-border bg-muted text-muted-foreground",
                  )}>
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={cn("hidden text-xs font-medium sm:block", active ? "text-primary" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("mx-1 h-0.5 flex-1 transition-all sm:mx-2", done ? "bg-primary" : "bg-border")} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="rounded-3xl border bg-card p-6 shadow-xl">
          {step === 1 && (
            <StepEstabelecimento form={estabForm} onChange={setEstabForm} />
          )}
          {step === 2 && (
            <StepCategorias categorias={categorias} onChange={setCategorias} />
          )}
          {step === 3 && (
            <StepProdutos produtos={produtos} onChange={setProdutos} categorias={categorias} />
          )}
          {step === 4 && (
            <StepMesas mesas={mesas} onChange={setMesas} />
          )}
          {step === 5 && <StepFinalizar />}

          {/* Navigation */}
          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <Button variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)} disabled={loading}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
            )}
            <Button className="flex-1" onClick={handleNext} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {step === 5 ? "Concluir configuração" : "Próximo"}
              {step < 5 && !loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step 1 ── */
function StepEstabelecimento({
  form, onChange,
}: { form: any; onChange: (v: any) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Dados do Estabelecimento</h2>
        <p className="text-sm text-muted-foreground">Informações que aparecerão no cardápio digital.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nome do estabelecimento *</Label>
          <Input placeholder="Ex: Burguer House" value={form.nome} onChange={(e) => onChange({ ...form, nome: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Logo URL</Label>
          <Input placeholder="https://..." value={form.logo_url} onChange={(e) => onChange({ ...form, logo_url: e.target.value })} />
          <p className="text-xs text-muted-foreground">Cole o link direto de uma imagem online</p>
        </div>
        <div className="space-y-1.5">
          <Label>WhatsApp</Label>
          <Input placeholder="(85) 99999-9999" value={form.whatsapp} onChange={(e) => onChange({ ...form, whatsapp: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Endereço</Label>
          <Input placeholder="Rua, número, bairro" value={form.endereco} onChange={(e) => onChange({ ...form, endereco: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Horário de funcionamento</Label>
          <Input placeholder="Seg–Sex 11h–22h / Sáb–Dom 11h–23h" value={form.horario} onChange={(e) => onChange({ ...form, horario: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

/* ── Step 2 ── */
function StepCategorias({ categorias, onChange }: { categorias: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Categorias do Cardápio</h2>
        <p className="text-sm text-muted-foreground">Organize seus produtos em categorias. Ex: Hambúrgueres, Bebidas, Sobremesas.</p>
      </div>
      <div className="space-y-3">
        {categorias.map((cat, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder={`Categoria ${i + 1}`}
              value={cat}
              onChange={(e) => { const next = [...categorias]; next[i] = e.target.value; onChange(next); }}
            />
            {categorias.length > 1 && (
              <Button size="icon" variant="ghost" onClick={() => onChange(categorias.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...categorias, ""])}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar categoria
        </Button>
      </div>
    </div>
  );
}

/* ── Step 3 ── */
function StepProdutos({
  produtos, onChange, categorias,
}: { produtos: any[]; onChange: (v: any[]) => void; categorias: string[] }) {
  const cats = categorias.filter((c) => c.trim());
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Produtos</h2>
        <p className="text-sm text-muted-foreground">Adicione seus produtos. Você poderá editar depois. (Opcional — pule se preferir)</p>
      </div>
      <div className="space-y-4">
        {produtos.map((p, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Produto {i + 1}</span>
              {produtos.length > 1 && (
                <Button size="icon" variant="ghost" onClick={() => onChange(produtos.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input placeholder="Ex: X-Burguer" value={p.nome}
                  onChange={(e) => { const n = [...produtos]; n[i] = { ...n[i], nome: e.target.value }; onChange(n); }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preço (R$)</Label>
                <Input placeholder="29,90" value={p.preco}
                  onChange={(e) => { const n = [...produtos]; n[i] = { ...n[i], preco: e.target.value }; onChange(n); }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={p.categoriaIdx}
                  onChange={(e) => { const n = [...produtos]; n[i] = { ...n[i], categoriaIdx: parseInt(e.target.value) }; onChange(n); }}
                >
                  {cats.map((c, ci) => <option key={ci} value={ci}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <Input placeholder="Breve descrição..." value={p.descricao}
                  onChange={(e) => { const n = [...produtos]; n[i] = { ...n[i], descricao: e.target.value }; onChange(n); }} />
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm"
          onClick={() => onChange([...produtos, { nome: "", preco: "", categoriaIdx: 0, descricao: "" }])}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar produto
        </Button>
      </div>
    </div>
  );
}

/* ── Step 4 ── */
function StepMesas({ mesas, onChange }: { mesas: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Mesas</h2>
        <p className="text-sm text-muted-foreground">Informe os números das mesas. Um QR Code único será gerado para cada uma.</p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {mesas.map((m, i) => (
          <div key={i} className="relative">
            <Input
              type="number" min="1" placeholder="Nº"
              value={m}
              className="text-center font-bold pr-7"
              onChange={(e) => { const n = [...mesas]; n[i] = e.target.value; onChange(n); }}
            />
            {mesas.length > 1 && (
              <button
                onClick={() => onChange(mesas.filter((_, j) => j !== i))}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={() => onChange([...mesas, ""])}>
        <Plus className="mr-2 h-4 w-4" /> Adicionar mesa
      </Button>
    </div>
  );
}

/* ── Step 5 ── */
function StepFinalizar() {
  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <div>
        <h2 className="text-xl font-bold">Tudo pronto!</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Seu estabelecimento está configurado. Clique em "Concluir" para ir ao painel administrativo
          e começar a operar.
        </p>
      </div>
      <div className="w-full rounded-xl border bg-muted/30 p-4 text-left space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Próximos passos</p>
        {[
          "Acesse Mesas e baixe os QR Codes para imprimir",
          "Adicione fotos aos seus produtos",
          "Configure os usuários da cozinha e garçons",
        ].map((tip, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
