"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Receipt, TrendingUp, Settings, Wallet, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/transactions", label: "Transações", icon: Receipt },
  { href: "/insights", label: "Análises", icon: TrendingUp },
  { href: "/settings", label: "Configurações", icon: Settings },
];

interface AppSidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out relative",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex h-16 items-center border-b border-sidebar-border transition-all duration-300",
        collapsed ? "justify-center px-0" : "gap-2.5 px-6"
      )}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Wallet className="h-4 w-4" strokeWidth={2.25} />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight overflow-hidden">
            <span className="text-sm font-semibold tracking-tight whitespace-nowrap">Aura</span>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">Controle pessoal</span>
          </div>
        )}
      </div>

      {/* Botão recolher — fixo no meio da borda direita */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-[72px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-muted-foreground shadow-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft className="h-3 w-3" />
        }
      </button>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
                    collapsed ? "justify-center gap-0" : "gap-3",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className={cn("border-t border-sidebar-border p-3", collapsed && "flex justify-center")}>
        {collapsed ? (
          <div title={user.name ?? user.email ?? "Usuário"}>
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={user.name ?? "Avatar"} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground uppercase">
                {(user.name ?? user.email ?? "U")[0]}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={user.name ?? "Avatar"} className="h-8 w-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground uppercase">
                {(user.name ?? user.email ?? "U")[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">{user.name ?? "Usuário"}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
