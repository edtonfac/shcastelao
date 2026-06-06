import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  QrCode,
  Download,
  Printer,
  Trash2,
  Edit,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import QRCode from "qrcode";

export const Route = createFileRoute("/admin/mesas")({
  head: () => ({ meta: [{ title: "Gerenciar Mesas | Admin" }] }),
  component: MesasPage,
});

interface Mesa {
  id: string;
  numero: number;
  nome: string | null;
  ativa: boolean;
  qr_token: string;
  created_at: string;
}

function MesasPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  // Form states
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [ativa, setAtiva] = useState(true);

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Query mesas
  const { data: mesas = [], isLoading, refetch } = useQuery({
    queryKey: ["mesas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mesas")
        .select("*")
        .order("numero", { ascending: true });
      if (error) throw error;
      return data as Mesa[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (newMesa: { numero: number; nome: string | null; qr_token: string }) => {
      const { data, error } = await supabase.from("mesas").insert(newMesa).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mesas"] });
      toast.success("Mesa criada com sucesso!");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error("Erro ao criar mesa: " + err.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updated: { id: string; numero: number; nome: string | null; ativa: boolean }) => {
      const { data, error } = await supabase
        .from("mesas")
        .update({ numero: updated.numero, nome: updated.nome, ativa: updated.ativa })
        .eq("id", updated.id)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mesas"] });
      toast.success("Mesa atualizada!");
      setIsEditOpen(false);
      setSelectedMesa(null);
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar mesa: " + err.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mesas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mesas"] });
      toast.success("Mesa excluída!");
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir mesa: " + err.message);
    },
  });

  function resetForm() {
    setNumero("");
    setNome("");
    setAtiva(true);
  }

  function handleCreate() {
    const num = parseInt(numero);
    if (isNaN(num) || num <= 0) {
      toast.error("Insira um número de mesa válido");
      return;
    }
    
    // Check if number already exists
    if (mesas.some((m) => m.numero === num)) {
      toast.error("Já existe uma mesa com esse número");
      return;
    }

    createMutation.mutate({
      numero: num,
      nome: nome.trim() || null,
      qr_token: crypto.randomUUID(),
    });
  }

  function handleUpdate() {
    if (!selectedMesa) return;
    const num = parseInt(numero);
    if (isNaN(num) || num <= 0) {
      toast.error("Insira um número de mesa válido");
      return;
    }

    // Check duplication (ignoring current)
    if (mesas.some((m) => m.numero === num && m.id !== selectedMesa.id)) {
      toast.error("Já existe outra mesa com esse número");
      return;
    }

    updateMutation.mutate({
      id: selectedMesa.id,
      numero: num,
      nome: nome.trim() || null,
      ativa,
    });
  }

  function openEdit(mesa: Mesa) {
    setSelectedMesa(mesa);
    setNumero(mesa.numero.toString());
    setNome(mesa.nome || "");
    setAtiva(mesa.ativa);
    setIsEditOpen(true);
  }

  function handleDelete(id: string) {
    if (window.confirm("Tem certeza que deseja excluir esta mesa? Todos os QR Codes associados serão invalidados.")) {
      deleteMutation.mutate(id);
    }
  }

  // Generate URL for QR code
  const getTableUrl = (token: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/m/${token}`;
    }
    return `/m/${token}`;
  };

  // Generate QR Code data URL when selectedMesa changes for QR Dialog
  useEffect(() => {
    if (selectedMesa && isQrOpen) {
      const url = getTableUrl(selectedMesa.qr_token);
      QRCode.toDataURL(
        url,
        { width: 300, margin: 2, color: { dark: "#0F172A", light: "#FFFFFF" } },
        (err, dataUrl) => {
          if (err) {
            console.error(err);
            toast.error("Erro ao gerar QR Code");
            return;
          }
          setQrCodeUrl(dataUrl);
        }
      );
    }
  }, [selectedMesa, isQrOpen]);

  function openQr(mesa: Mesa) {
    setSelectedMesa(mesa);
    setIsQrOpen(true);
  }

  const handleDownload = () => {
    if (!selectedMesa || !qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `mesa-${selectedMesa.numero}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download iniciado!");
  };

  const handlePrint = () => {
    if (!selectedMesa || !qrCodeUrl) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up bloqueado. Permita pop-ups para imprimir.");
      return;
    }

    const url = getTableUrl(selectedMesa.qr_token);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Mesa ${selectedMesa.numero} - QR Code</title>
          <style>
            body {
              font-family: 'Inter', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: white;
              color: black;
              text-align: center;
            }
            .container {
              border: 3px solid #000;
              padding: 40px;
              border-radius: 20px;
              max-width: 400px;
            }
            h1 {
              font-size: 36px;
              margin: 0 0 10px 0;
              font-weight: 800;
            }
            h2 {
              font-size: 20px;
              color: #4b5563;
              margin: 0 0 30px 0;
            }
            img {
              width: 280px;
              height: 280px;
            }
            p {
              margin-top: 30px;
              font-size: 14px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>MESA ${selectedMesa.numero}</h1>
            <h2>${selectedMesa.nome || "Escaneie para fazer seu pedido"}</h2>
            <img src="${qrCodeUrl}" alt="QR Code" />
            <p>Aponte a câmera do celular para o código acima</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter mesas by search term
  const filteredMesas = mesas.filter((m) => {
    const numStr = m.numero.toString();
    const nomeStr = m.nome?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    return numStr.includes(term) || nomeStr.includes(term);
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Mesas</h1>
          <p className="text-muted-foreground">
            Gerencie as mesas do estabelecimento e obtenha os QR Codes para os clientes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Mesa
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Lista de Mesas</CardTitle>
              <CardDescription>
                Exibindo {filteredMesas.length} {filteredMesas.length === 1 ? "mesa" : "mesas"}.
              </CardDescription>
            </div>
            <div className="relative w-full max-w-sm sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar mesa..."
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
          ) : filteredMesas.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <p className="text-muted-foreground">Nenhuma mesa encontrada.</p>
              <Button onClick={() => setIsCreateOpen(true)} variant="link" className="mt-2 text-primary">
                Criar a primeira mesa
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Número</TableHead>
                    <TableHead>Identificação / Nome</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-40 text-center">QR Code</TableHead>
                    <TableHead className="w-32 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMesas.map((mesa) => (
                    <TableRow key={mesa.id} className="hover:bg-muted/50">
                      <TableCell className="font-bold text-lg">
                        #{mesa.numero}
                      </TableCell>
                      <TableCell className="font-medium text-muted-foreground">
                        {mesa.nome || <span className="italic text-muted-foreground/50">Sem nome</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={mesa.ativa ? "default" : "secondary"}>
                          {mesa.ativa ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openQr(mesa)}
                          className="gap-1.5"
                        >
                          <QrCode className="h-4 w-4 text-primary" /> Visualizar QR
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(mesa)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(mesa.id)}
                            className="hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Mesa</DialogTitle>
            <DialogDescription>
              Adicione uma nova mesa para gerar o QR Code correspondente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-numero">Número da Mesa *</Label>
              <Input
                id="create-numero"
                type="number"
                min="1"
                placeholder="Ex: 5"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-nome">Nome / Apelido (Opcional)</Label>
              <Input
                id="create-nome"
                placeholder="Ex: Varanda, VIP, Próximo ao Bar"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Mesa #{selectedMesa?.numero}</DialogTitle>
            <DialogDescription>
              Ajuste as informações de identificação e status da mesa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-numero">Número da Mesa *</Label>
              <Input
                id="edit-numero"
                type="number"
                min="1"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-nome">Nome / Apelido</Label>
              <Input
                id="edit-nome"
                placeholder="Ex: Varanda"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="edit-ativa">Mesa Ativa</Label>
                <p className="text-xs text-muted-foreground">
                  Se desativada, clientes não conseguirão fazer pedidos por esta mesa.
                </p>
              </div>
              <Switch
                id="edit-ativa"
                checked={ativa}
                onCheckedChange={setAtiva}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              QR Code - Mesa {selectedMesa?.numero}
            </DialogTitle>
            <DialogDescription className="text-center">
              {selectedMesa?.nome ? `(${selectedMesa.nome})` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-6 py-4">
            {qrCodeUrl ? (
              <div className="relative rounded-2xl border-4 border-slate-900 bg-white p-6 shadow-md transition-all hover:scale-[1.02]">
                <img src={qrCodeUrl} alt="Mesa QR Code" className="h-56 w-56 object-contain" />
              </div>
            ) : (
              <div className="flex h-56 w-56 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <div className="text-center text-sm">
              <p className="font-semibold text-muted-foreground">Link de acesso:</p>
              <code className="mt-1 block rounded bg-muted p-2 text-xs break-all text-primary font-mono select-all">
                {selectedMesa ? getTableUrl(selectedMesa.qr_token) : ""}
              </code>
            </div>
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={handleDownload} className="w-full sm:w-auto gap-2">
              <Download className="h-4 w-4" /> Download PNG
            </Button>
            <Button onClick={handlePrint} className="w-full sm:w-auto gap-2 bg-slate-950 text-white hover:bg-slate-900">
              <Printer className="h-4 w-4" /> Imprimir QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
