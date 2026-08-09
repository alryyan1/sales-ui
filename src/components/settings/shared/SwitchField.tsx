import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SwitchFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function SwitchField({
  label,
  description,
  checked,
  onCheckedChange,
  className,
}: SwitchFieldProps) {
  return (
    <label
      className={cn(
        "-mx-2 flex cursor-pointer items-start justify-between gap-4 rounded-lg px-2 py-2 transition-colors hover:bg-accent/40",
        className
      )}
    >
      <div className="space-y-0.5">
        <p className="text-sm font-medium leading-none text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5 shrink-0"
      />
    </label>
  );
}
