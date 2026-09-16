import { PlanView } from "@/components/viewers/plan-view";

export default function PlanPage({ params }: { params: { id: string } }) {
  return <PlanView id={params.id} />;
}