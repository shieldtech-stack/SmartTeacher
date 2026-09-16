import { NotesView } from "@/components/viewers/notes-view";

export default function NotesPage({ params }: { params: { id: string } }) {
  return <NotesView id={params.id} />;
}