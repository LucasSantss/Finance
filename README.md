# Aura Finance

Controle financeiro pessoal de alto desempenho com design minimalista.

**Stack:** Next.js 14 App Router · Tailwind CSS · Shadcn/UI · PostgreSQL (Neon) · Prisma · NextAuth.js · Vercel

---

## Pré-requisitos

- Node.js 18+
- Conta gratuita na [Neon.tech](https://neon.tech) (PostgreSQL serverless)
- App OAuth no [Google](https://console.cloud.google.com/apis/credentials) e/ou [GitHub](https://github.com/settings/developers)
- Conta na [Vercel](https://vercel.com) para deploy

---

## Setup local

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:

| Variável | Onde obter |
|---|---|
| `DATABASE_URL` | Painel Neon → Connection string (pooled) |
| `DIRECT_URL` | Painel Neon → Connection string (direct) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID/SECRET` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GITHUB_ID/SECRET` | [GitHub Developer Settings](https://github.com/settings/developers) |
| `WEBHOOK_SECRET` | `openssl rand -hex 32` |

### 3. Gere o Prisma Client e rode as migrações

```bash
# Gera o client tipado
npm run db:generate

# Aplica o schema ao banco da Neon
npm run db:push

# Ou, para criar migrations versionadas:
npm run db:migrate
```

### 4. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Estrutura do projeto

```
aura-finance/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # NextAuth handler
│   │   └── webhooks/transactions/route.ts # Open Finance webhook
│   ├── insights/page.tsx                 # Análises (gráfico pizza)
│   ├── login/page.tsx                    # Página de login OAuth
│   ├── settings/page.tsx                 # Configurações + webhook docs
│   ├── transactions/page.tsx             # Listagem com filtros
│   ├── layout.tsx                        # Root layout (sidebar + header)
│   ├── page.tsx                          # Dashboard principal
│   └── globals.css                       # Design tokens CSS
├── components/
│   ├── app-sidebar.tsx                   # Sidebar fixa com nav
│   ├── app-header.tsx                    # Header (tema + signout)
│   ├── transaction-form.tsx              # Formulário de nova transação
│   ├── transaction-list.tsx              # Lista de transações (Server)
│   ├── transaction-list-client.tsx       # Lista com filtros (Client)
│   ├── monthly-chart.tsx                 # Gráfico de barras Recharts
│   ├── category-pie-chart.tsx            # Gráfico pizza por categoria
│   ├── stat-card.tsx                     # Card de estatística
│   ├── delete-transaction-button.tsx     # Botão excluir (Client)
│   └── copy-button.tsx                   # Botão copiar (Client)
├── lib/
│   ├── actions.ts                        # Server Actions + revalidatePath
│   ├── auth.ts                           # NextAuth config + PrismaAdapter
│   ├── prisma.ts                         # Prisma Client singleton
│   └── utils.ts                          # formatBRL, categories, cn()
├── prisma/
│   └── schema.prisma                     # Schema User + Transaction + enum
├── middleware.ts                          # Proteção de rotas
└── .env.example                          # Template de variáveis
```

---

## Schema do banco de dados

```prisma
model User {
  id           String        @id @default(cuid())
  name         String?
  email        String        @unique
  transactions Transaction[]
  createdAt    DateTime      @default(now())
}

model Transaction {
  id          String          @id @default(cuid())
  userId      String
  description String
  amount      Decimal         @db.Decimal(10, 2)
  type        TransactionType  // INCOME | EXPENSE
  category    String
  source      String          @default("manual")
  date        DateTime
  createdAt   DateTime        @default(now())
}
```

---

## Webhook (Open Finance)

Envie transações de sistemas externos:

```bash
POST /api/webhooks/transactions
Content-Type: application/json
x-webhook-secret: <WEBHOOK_SECRET>

{
  "userId": "clxxx...",
  "description": "Compra no mercado",
  "amount": 152.40,
  "type": "EXPENSE",
  "category": "Alimentação",
  "date": "2025-04-17T10:00:00Z"
}
```

Resposta de sucesso: `201 { ok: true, id: "clxxx..." }`

---

## Deploy na Vercel

```bash
# 1. Instale a Vercel CLI
npm i -g vercel

# 2. Faça login
vercel login

# 3. Deploy
vercel --prod
```

Configure as mesmas variáveis do `.env.example` no painel da Vercel em **Settings → Environment Variables**.

> **Dica Neon:** No painel da Neon, ative a integração com a Vercel para que as variáveis `DATABASE_URL` e `DIRECT_URL` sejam preenchidas automaticamente.

---

## Comandos úteis

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run db:push` | Aplica schema ao banco (sem migration) |
| `npm run db:migrate` | Cria migration versionada |
| `npm run db:studio` | Prisma Studio (GUI do banco) |
| `npm run db:generate` | Regenera Prisma Client após schema change |
