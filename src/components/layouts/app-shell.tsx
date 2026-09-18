"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpenCheck,
  FolderUp,
  Wand2,
  FolderOpen,
  Settings,
  CloudOff,
  Cloud,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnline } from "@/hooks/use-online";
import { getDataMode, type DataMode } from "@/lib/settings";
import { flushSyncQueue, pullDocuments } from "@/lib/offline/sync";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogIn, User } from "lucide-react";

const NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/curriculum", label: "Curriculum", icon: BookOpenCheck },
  { href: "/documents", label: "Documents", icon: FolderUp },
  { href: "/generate", label: "Generate", icon: Wand2 },
  { href: "/library", label: "Library", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const online = useOnline();
  const [dataMode, setDataModeState] = React.useState<DataMode>("local");
  const { user, initializing, signOut } = useAuth();
  const isPrint = pathname.startsWith("/print");
  const userId = user?.id;

  React.useEffect(() => {
    setDataModeState(getDataMode());
  }, []);

  React.useEffect(() => {
    if (online) flushSyncQueue().catch(() => {});
  }, [online]);

  React.useEffect(() => {
    if (userId && online) {
      pullDocuments()
        .then(() => flushSyncQueue())
        .catch(() => {});
    }
  }, [userId, online]);

  if (isPrint) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-40 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="hidden sm:inline">SmartTeacher</span>
          </Link>
          <div className="flex items-center gap-2 text-xs">
            {online ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <Cloud className="h-3.5 w-3.5" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600">
                <CloudOff className="h-3.5 w-3.5" /> Offline
              </span>
            )}
            <span className="hidden rounded-full border px-2 py-0.5 text-muted-foreground sm:inline">
              {dataMode === "supabase" ? "Supabase" : "Local"}
            </span>
            <AccountChip userInitial={user?.email?.slice(0, 2).toUpperCase()} signedIn={Boolean(user)} initializing={initializing} onSignOut={signOut} />
          </div>
        </div>
      </header>

      <nav className="no-print sticky top-14 z-40 border-b bg-card/80 backdrop-blur">
        <div className="flex items-stretch justify-around sm:hidden">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-14 items-center justify-center rounded-full transition-colors",
                    active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground group-hover:bg-secondary/70"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className={cn(active && "font-semibold")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="hidden items-center gap-1 px-4 py-2 sm:flex">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-6">{children}</main>
    </div>
  );
}

function AccountChip({
  userInitial,
  signedIn,
  initializing,
  onSignOut,
}: {
  userInitial?: string;
  signedIn: boolean;
  initializing: boolean;
  onSignOut: () => void;
}) {
  if (initializing) return null;
  if (!signedIn) {
    return (
      <Button variant="outline" size="sm" asChild className="h-7 gap-1 px-2 text-xs">
        <Link href="/auth">
          <LogIn className="h-3.5 w-3.5" /> Sign in
        </Link>
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          aria-label="Account menu"
        >
          <User className="h-3.5 w-3.5" />
          {userInitial || "Me"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => {
            onSignOut();
            if (typeof window !== "undefined") window.location.assign("/");
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}