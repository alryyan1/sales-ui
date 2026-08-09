import { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section>
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Separator className="mt-4 mb-6" />
      <div className="space-y-8">{children}</div>
    </section>
  );
}
