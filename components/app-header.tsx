"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Sun, Moon, LogOut, Menu, X, LayoutDashboard, Receipt, CalendarDays, Repeat, TrendingUp, Settings, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AppHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const navItems = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/transactions", label: "Transações", icon: Receipt },
  { href: "/planning", label: "Planejamento", icon: CalendarDays },
  { href: "/recurring", label: "Recorrências", icon: Repeat },
  { href: "/insights", label: "Análises", icon: TrendingUp },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function AppHeader({ user }: AppHeaderProps) {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as typeof theme) ?? "system";
    setTheme(stored);
  }, []);

  // Fecha drawer ao trocar de página
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <>
      <header className="flex md:hidden h-16 items-center justify-between border-b border-border bg-background px-6 z-30 relative">
        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Logo mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Wallet className="h-3.5 w-3.5" strokeWidth={2.25} />
          </div>
          <span className="text-sm font-semibold tracking-tight">Aura</span>
        </div>

        <div className="hidden md:block" />

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Alternar tema"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-9 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

          {/* Drawer */}
          <nav
            className="absolute top-16 left-0 right-0 border-b border-border bg-background shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <ul className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* User info no drawer */}
            <div className="mx-4 mb-3 mt-1 flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
              {user.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={user.image} alt={user.name ?? "Avatar"} className="h-7 w-7 rounded-full object-cover shrink-0" />
                : <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground uppercase">{(user.name ?? user.email ?? "U")[0]}</div>
              }
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{user.name ?? "Usuário"}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
