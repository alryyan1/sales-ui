import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsGroupProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function SettingsGroup({
  title,
  description,
  action,
  className,
  children,
}: SettingsGroupProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
