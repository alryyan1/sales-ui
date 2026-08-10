// src/components/pos/ThemeColorPicker.tsx
import { Check, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { POS_THEME_COLORS, type PosThemeColor } from "@/lib/posTheme";

interface ThemeColorPickerProps {
  selectedId: string;
  onSelect: (color: PosThemeColor) => void;
}

export function ThemeColorPicker({ selectedId, onSelect }: ThemeColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" aria-label="لون الواجهة">
          <Palette className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56" dir="rtl">
        <p className="mb-2 text-xs font-medium text-muted-foreground">لون الواجهة</p>
        <div className="grid grid-cols-6 gap-2">
          {POS_THEME_COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              onClick={() => onSelect(color)}
              title={color.name}
              aria-label={color.name}
              className={cn(
                "flex size-8 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
                selectedId === color.id && "ring-2 ring-foreground"
              )}
              style={{ backgroundColor: color.primary }}
            >
              {selectedId === color.id && <Check className="size-4" style={{ color: color.foreground }} />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
