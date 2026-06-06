import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useEstabelecimento, useSalvarEstabelecimento } from "@/hooks/useEstabelecimento";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save, Upload, Sparkles, Sliders } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações | Admin" }] }),
  component: ConfiguracoesPage,
});

const PRESET_PALETTES = [
  { name: "Teal Moderno (Padrão)", primary: "#1FB8DB", secondary: "#0EA5E9" },
  { name: "Hamburgueria Clássica", primary: "#EA580C", secondary: "#F59E0B" },
  { name: "Cafeteria Cozy", primary: "#78350F", secondary: "#D97706" },
  { name: "Bistrô Italiano", primary: "#16A34A", secondary: "#DC2626" },
  { name: "Dark Moderno", primary: "#0F172A", secondary: "#64748B" },
];

function ConfiguracoesPage() {
  const { data: estab, isLoading } = useEstabelecimento();
  const salvarMutation = useSalvarEstabelecimento();
  
  const [nome, setNome] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [endereco, setEndereco] = useState("");
  const [horario, setHorario] = useState("");
  const [corPrimaria, setCorPrimaria] = useState("#1FB8DB");
  const [corSecundaria, setCorSecundaria] = useState("#0EA5E9");
  
  const [uploading, setUploading] = useState(false);

  // Sync form with data
  useEffect(() => {
    if (estab) {
      setNome(estab.nome || "");
      setLogoUrl(estab.logo_url || "");
      setWhatsapp(estab.whatsapp || "");
      setEndereco(estab.endereco || "");
      setHorario(estab.horario || "");
      setCorPrimaria(estab.cor_primaria || "#1FB8DB");
      setCorSecundaria(estab.cor_secundaria || "#0EA5E9");
    }
  }, [estab]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from("produtos") // fallback using the existing public storage if logos doesn't exist
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("produtos")
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast.success("Logo enviada com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro no upload da logo (verifique se o bucket 'produtos' existe e é público): " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!nome.trim()) {
      toast.error("O nome do estabelecimento é obrigatório");
      return;
    }

    salvarMutation.mutate(
      {
        nome,
        logo_url: logoUrl.trim() || null,
        whatsapp: whatsapp.trim() || null,
        endereco: endereco.trim() || null,
        horario: horario.trim() || null,
        cor_primaria: corPrimaria,
        cor_secundaria: corSecundaria,
      },
      {
        onSuccess: () => {
          toast.success("Configurações salvas!");
        },
        onError: (err: any) => {
          toast.error("Erro ao salvar: " + err.message);
        },
      }
    );
  };

  const applyPalette = (primary: string, secondary: string) => {
    setCorPrimaria(primary);
    setCorSecundaria(secondary);
    toast.success("Paleta de cores aplicada!");
  };

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Ajuste as preferências, identidade visual e dados operacionais do estabelecimento.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main form */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Identidade do Estabelecimento</CardTitle>
              <CardDescription>Configure o nome, logomarca e horários públicos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome do Estabelecimento *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Shalom Castelão"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="logo">Link da Logo (URL)</Label>
                <Input
                  id="logo"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">URL direta de uma imagem hospedada.</p>
              </div>

              <div className="rounded-lg border bg-muted/40 p-4">
                <Label className="text-sm font-semibold mb-2 block">Ou Envie um Arquivo</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadLogo}
                    disabled={uploading}
                    className="max-w-xs cursor-pointer"
                  />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="whatsapp">WhatsApp para Contato</Label>
                  <Input
                    id="whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ex: (85) 99999-9999"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="horario">Horário de Funcionamento</Label>
                  <Input
                    id="horario"
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    placeholder="Ex: Seg a Sáb das 18h às 23h"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endereco">Endereço Físico</Label>
                <Input
                  id="endereco"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex: Av. Alberto Craveiro, 2222"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Identidade Visual & Cores</CardTitle>
              <CardDescription>Personalize as cores primárias do seu cardápio digital.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    Cor Primária
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={corPrimaria}
                      onChange={(e) => setCorPrimaria(e.target.value)}
                      className="h-10 w-16 p-0.5 cursor-pointer rounded-lg border-2"
                    />
                    <Input
                      type="text"
                      value={corPrimaria}
                      onChange={(e) => setCorPrimaria(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    Cor Secundária
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={corSecundaria}
                      onChange={(e) => setCorSecundaria(e.target.value)}
                      className="h-10 w-16 p-0.5 cursor-pointer rounded-lg border-2"
                    />
                    <Input
                      type="text"
                      value={corSecundaria}
                      onChange={(e) => setCorSecundaria(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Paletas Pré-definidas
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PRESET_PALETTES.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => applyPalette(p.primary, p.secondary)}
                      className="flex items-center justify-between rounded-lg border p-2 text-left text-sm hover:bg-muted transition-all"
                    >
                      <span className="font-medium">{p.name}</span>
                      <div className="flex gap-1">
                        <div
                          className="h-4 w-4 rounded-full border border-black/10"
                          style={{ backgroundColor: p.primary }}
                        />
                        <div
                          className="h-4 w-4 rounded-full border border-black/10"
                          style={{ backgroundColor: p.secondary }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar / Live Preview */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Visualização
              </CardTitle>
              <CardDescription>Prévia de como ficará o cardápio do seu cliente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border-8 border-slate-900 overflow-hidden shadow-2xl bg-slate-50 dark:bg-slate-950 aspect-[9/16] w-full max-w-[280px] mx-auto flex flex-col justify-between">
                {/* Header */}
                <div
                  className="p-4 text-white text-center flex flex-col items-center justify-center gap-2 transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${corPrimaria}, ${corSecundaria})`,
                  }}
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo Preview"
                      className="h-10 w-10 rounded-full border-2 border-white object-cover shadow bg-white"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full border-2 border-white bg-white/20 flex items-center justify-center font-bold text-sm">
                      {nome ? nome.substring(0, 2).toUpperCase() : "R"}
                    </div>
                  )}
                  <h3 className="font-extrabold text-sm tracking-tight leading-tight">
                    {nome || "Seu Restaurante"}
                  </h3>
                  <span className="text-[10px] bg-white/20 rounded-full px-2 py-0.5 font-medium leading-none">
                    Mesa #01
                  </span>
                </div>

                {/* Body */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-16 rounded-lg bg-card border p-2 flex flex-col justify-between">
                      <div className="h-2 w-10 bg-muted rounded" />
                      <div
                        className="h-3 w-8 rounded animate-pulse"
                        style={{ backgroundColor: `${corPrimaria}22` }}
                      />
                    </div>
                    <div className="h-16 rounded-lg bg-card border p-2 flex flex-col justify-between">
                      <div className="h-2 w-12 bg-muted rounded" />
                      <div
                        className="h-3 w-6 rounded animate-pulse"
                        style={{ backgroundColor: `${corPrimaria}22` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Button */}
                <div className="p-3 border-t bg-card">
                  <Button
                    className="w-full text-xs h-8 text-white font-bold"
                    style={{ backgroundColor: corPrimaria }}
                  >
                    Ver Carrinho
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={salvarMutation.isPending}
                className="w-full gap-2 font-bold"
              >
                {salvarMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
