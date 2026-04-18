import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Webhook, Copy } from "lucide-react";
import { CopyButton } from "@/components/copy-button";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const baseUrl =
    process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  const webhookUrl = `${baseUrl}/api/webhooks/transactions`;

  const examplePayload = JSON.stringify(
    {
      userId: session.user.id,
      description: "Compra no mercado",
      amount: 152.4,
      type: "EXPENSE",
      category: "Alimentação",
      date: new Date().toISOString(),
    },
    null,
    2
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">
          Conta, preferências e integrações.
        </p>
      </header>

      {/* Account */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-foreground">Conta</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Nome</dt>
            <dd className="font-medium text-foreground">
              {session.user.name ?? "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium text-foreground">
              {session.user.email}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">ID do usuário</dt>
            <dd className="font-mono text-xs text-muted-foreground">
              {session.user.id}
            </dd>
          </div>
        </dl>
      </section>

      {/* Webhook */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <Webhook className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Webhook — Integração Open Finance
            </h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Envie transações de sistemas externos para esta URL via{" "}
              <code className="rounded bg-muted px-1 py-0.5">POST</code>.
              Inclua seu{" "}
              <code className="rounded bg-muted px-1 py-0.5">userId</code> e o
              header{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                x-webhook-secret
              </code>{" "}
              configurado no servidor.
            </p>
          </div>
        </div>

        {/* Webhook URL */}
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <code className="flex-1 truncate text-xs text-muted-foreground">
            {webhookUrl}
          </code>
          <CopyButton value={webhookUrl} />
        </div>

        {/* Example */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-muted-foreground transition-colors select-none">
            Exemplo de requisição
          </summary>
          <div className="mt-3 space-y-2">
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {`POST ${webhookUrl}
Content-Type: application/json
x-webhook-secret: <seu_secret>

${examplePayload}`}
            </pre>
            <p className="text-xs text-muted-foreground">
              A resposta de sucesso retorna{" "}
              <code className="rounded bg-muted px-1">
                {"{ ok: true, id: '...' }"}
              </code>{" "}
              com status <code className="rounded bg-muted px-1">201</code>.
            </p>
          </div>
        </details>
      </section>

      {/* Schema info */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Banco de dados (Neon + Prisma)
        </h2>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {`model Transaction {
  id          String          @id @default(cuid())
  userId      String
  description String
  amount      Decimal         @db.Decimal(10, 2)
  type        TransactionType  // INCOME | EXPENSE
  category    String
  source      String          @default("manual")
  date        DateTime
  createdAt   DateTime        @default(now())
}`}
        </pre>
      </section>
    </div>
  );
}
