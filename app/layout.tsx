import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Aura — Controle Financeiro Pessoal",
    template: "%s — Aura",
  },
  description:
    "Aplicativo minimalista para acompanhar receitas, despesas e saldo mensal com gráficos em tempo real.",
  openGraph: {
    title: "Aura — Controle Financeiro",
    description: "Acompanhe seu fluxo financeiro de forma simples e elegante.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeScript />
        {session?.user ? (
          <div className="flex min-h-screen bg-background">
            <AppSidebar user={session.user} />
            <div className="flex flex-1 flex-col min-w-0">
              <AppHeader user={session.user} />
              <main className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full">
                {children}
              </main>
            </div>
          </div>
        ) : (
          <>{children}</>
        )}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--card-foreground))",
            },
          }}
        />
      </body>
    </html>
  );
}

// Injeta o tema antes do primeiro paint para evitar flash
function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          try {
            const theme = localStorage.getItem('theme') ?? 'system';
            const dark =
              theme === 'dark' ||
              (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            if (dark) document.documentElement.classList.add('dark');
          } catch {}
        `,
      }}
    />
  );
}
