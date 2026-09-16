import { SettingsView } from "@/components/settings/settings-view";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how SmartTeacher generates content and where your documents are stored.
        </p>
      </div>
      <SettingsView />
    </div>
  );
}