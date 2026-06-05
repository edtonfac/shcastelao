
# Shalom Castelão — Sistema de Pedidos por QR Code

App mobile-first para o restaurante gerenciar pedidos por mesa via QR Code, com 4 perfis de uso e atualizações em tempo real.

## Identidade visual

- Cor primária: ciano da logo (#1FB8DB aprox.), com superfícies escuras opcionais para dark mode.
- Logo Shalom Castelão usada em splash, header do cliente, login admin e PWA icon.
- Tipografia moderna sem serifa (Inter para corpo + Space Grotesk para títulos).
- Sistema iniciado VAZIO — nenhum produto/categoria/mesa pré-cadastrado.

## Perfis e fluxos

**Cliente** (rota pública `/m/:mesaId`)
- Escaneia QR → identifica a mesa automaticamente
- Cardápio por categorias com foto/preço/descrição
- Página do produto com observações (se permitido)
- Carrinho (add/alterar/remover) → "Enviar Pedido"
- Tela de acompanhamento em tempo real (5 status)

**Cozinha** (`/cozinha`, login)
- Abas: Recebidos / Em preparo / Prontos
- Cards com nº pedido, mesa, itens, observações
- Botões: Iniciar Preparo → Marcar como Pronto

**Garçom** (`/garcom`, login)
- Lista de pedidos prontos
- Assumir Entrega (status vira "Garçom a caminho") → Marcar Entregue

**Administração** (`/admin`, login)
- Dashboard com totais do dia
- CRUD: Categorias, Produtos (com upload de foto), Mesas
- Geração automática de QR Code por mesa (download PNG/PDF)
- Lista de todos os pedidos com filtros
- Configurações do estabelecimento (nome, logo)

## Wizard de configuração inicial

Disparado no primeiro login admin (quando não há categorias/produtos/mesas):
1. Cadastrar Categorias (exemplos só como placeholder visual, não salvos)
2. Cadastrar Produtos (nome, categoria, preço, foto, descrição, ingredientes, permite observações)
3. Cadastrar Mesas (número + nome opcional) → QR Codes gerados
4. Finalizar → vai para o dashboard

## Banco de dados (Supabase / Lovable Cloud)

Tabelas:
- `profiles` (id ↔ auth.users, nome, estabelecimento_id)
- `user_roles` (user_id, role: admin|cozinha|garcom) — tabela separada para evitar escalonamento
- `estabelecimento` (singleton: nome, logo_url)
- `categorias` (id, nome, ordem)
- `produtos` (id, categoria_id, nome, preco, foto_url, descricao, ingredientes, permite_observacao, ativo)
- `mesas` (id, numero, nome, qr_token único)
- `pedidos` (id, numero_sequencial, mesa_id, status enum, garcom_id, timestamps)
- `itens_pedido` (id, pedido_id, produto_id, quantidade, observacao, preco_unit)

Enum status: `recebido | em_preparo | pronto | garcom_a_caminho | entregue`.

RLS:
- Cliente (anônimo) pode inserir pedido/itens via mesa válida e ler apenas o próprio pedido (token na URL)
- Cozinha/Garçom/Admin via `has_role()` (security definer)
- Storage bucket público `produtos` para fotos

Realtime habilitado em `pedidos` e `itens_pedido`.

## Stack técnica

- TanStack Start + React + TypeScript + Tailwind v4
- Lovable Cloud (Supabase) — auth, DB, storage, realtime
- `qrcode` para gerar QR Codes (PNG inline + download)
- PWA instalável (manifest + ícones a partir da logo)
- Dark mode com toggle
- React Query para data fetching, Realtime channels para atualizações ao vivo

## Detalhes técnicos importantes

- Rota cliente é pública e identifica a mesa pelo `qr_token` (não pelo id numérico) para evitar adivinhação
- Pedido do cliente armazenado em `localStorage` para reabrir tela de acompanhamento
- Numeração sequencial diária do pedido via função SQL
- Upload de imagem comprimido no client antes de enviar
- Login único em `/auth`; após login, redireciona conforme role (admin/cozinha/garçom)
- Wizard bloqueia navegação admin até concluído (pode pular passos opcionais)

## Entregáveis desta primeira versão

1. Habilitar Lovable Cloud + criar schema + RLS + storage + seed do role admin para o primeiro usuário
2. Auth (email/senha) + página `/auth` + roteamento por perfil
3. Wizard de setup inicial
4. Admin: CRUD completo de categorias, produtos, mesas + QR Codes
5. Cliente: cardápio, produto, carrinho, envio, acompanhamento realtime
6. Cozinha: painel realtime com ações
7. Garçom: painel realtime com ações
8. PWA + dark mode + identidade visual Shalom Castelão

Pergunta rápida antes de começar: o primeiro usuário que se cadastrar deve virar **admin automaticamente** (mais simples para o primeiro acesso), ou prefere que eu crie um usuário admin fixo com email/senha que você me informa?
