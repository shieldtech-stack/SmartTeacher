"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ListChecks, FileText, Trash2, Plus } from "lucide-react";
import { seedIfEmpty } from "@/lib/db/local-store";
import { listSchemes, listPlans, listNotes, deleteScheme, deletePlan, deleteNote } from "@/lib/db/store";
import type { SchemeOfWork, LessonPlan, LessonNote } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export function LibraryView() {
  const router = useRouter();
  const { toast } = useToast();
  const [schemes, setSchemes] = React.useState<SchemeOfWork[]>([]);
  const [plans, setPlans] = React.useState<LessonPlan[]>([]);
  const [notes, setNotes] = React.useState<LessonNote[]>([]);
  const [ready, setReady] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const [s, p, n] = await Promise.all([listSchemes(), listPlans(), listNotes()]);
    setSchemes(s);
    setPlans(p);
    setNotes(n);
  }, []);

  React.useEffect(() => {
    (async () => {
      await seedIfEmpty();
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

  const onDelete = async (kind: "scheme" | "plan" | "note", id: string) => {
    if (kind === "scheme") await deleteScheme(id);
    if (kind === "plan") await deletePlan(id);
    if (kind === "note") await deleteNote(id);
    toast({ description: "Document deleted." });
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Library</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/generate">
            <Plus className="h-4 w-4" /> New
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="schemes">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schemes">Schemes ({schemes.length})</TabsTrigger>
          <TabsTrigger value="plans">Plans ({plans.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="schemes">
          <DocListItems
            items={schemes.map((s) => ({ id: s.id, icon: <BookOpen className="h-5 w-5 text-primary" />, title: s.title, meta: `${s.subject} • ${s.gradeLevel} • ${s.term} ${s.year} • ${s.rows.length} lessons` }))}
            base="/scheme"
            kind="scheme"
            onDelete={onDelete}
            emptyMsg="No Schemes of Work yet."
          />
        </TabsContent>
        <TabsContent value="plans">
          <DocListItems
            items={plans.map((p) => ({ id: p.id, icon: <ListChecks className="h-5 w-5 text-primary" />, title: p.title, meta: `${p.subject} • ${p.gradeLevel} • ${p.durationMinutes} min` }))}
            base="/plan"
            kind="plan"
            onDelete={onDelete}
            emptyMsg="No Lesson Plans yet."
          />
        </TabsContent>
        <TabsContent value="notes">
          <DocListItems
            items={notes.map((n) => ({ id: n.id, icon: <FileText className="h-5 w-5 text-primary" />, title: n.title, meta: `${n.subject} • ${n.gradeLevel}` }))}
            base="/notes"
            kind="note"
            onDelete={onDelete}
            emptyMsg="No Lesson Notes yet."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface DocItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  meta: string;
}

function DocListItems({
  items,
  base,
  kind,
  onDelete,
  emptyMsg,
}: {
  items: DocItem[];
  base: string;
  kind: "scheme" | "plan" | "note";
  onDelete: (kind: "scheme" | "plan" | "note", id: string) => void;
  emptyMsg: string;
}) {
  if (items.length === 0) {
    return <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{emptyMsg}</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex items-center justify-between gap-3 p-3">
            <Link href={`${base}/${item.id}`} className="flex min-w-0 items-center gap-3">
              {item.icon}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">{item.meta}</p>
              </div>
            </Link>
            <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => onDelete(kind, item.id)}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}