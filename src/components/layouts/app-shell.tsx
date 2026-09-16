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
import { getDataMode } from "@/lib/settings";
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
  const dataMode = getDataMode();
  const { user, initializing, signOut } = useAuth();
  const isPrint = pathname.startsWith("/print");
  const userId = user?.id;

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

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:pb-10">{children}</main>

      <footer className="no-print">
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card sm:hidden">
          <div className="flex items-stretch justify-around">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="hidden border-t sm:block">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-1 px-4 py-2 text-sm text-muted-foreground">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("rounded-md px-3 py-1.5", active ? "bg-secondary font-medium text-foreground" : "hover:bg-secondary/60")}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </footer>
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