import { SchemeView } from "@/components/viewers/scheme-view";

export default function SchemePage({ params }: { params: { id: string } }) {
  return <SchemeView id={params.id} />;
}