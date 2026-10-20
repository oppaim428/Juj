import { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const colors = ["green", "orange", "yellow", "blue"] as const;
type GlowColor = (typeof colors)[number];

export function GlowPicker() {
  const [color, setColor] = useState<GlowColor>("green");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("juj-glow");
      const selected = colors.find((value) => value === saved) ?? "green";
      setColor(selected);
      document.documentElement.dataset["glow"] = selected;
    } catch { /* Storage may be unavailable. Keep the default. */ }
  }, []);

  function select(value: GlowColor) {
    setColor(value);
    document.documentElement.dataset["glow"] = value;
    try { localStorage.setItem("juj-glow", value); } catch { /* Still apply for this visit. */ }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0 text-ring" aria-label="Glow color" title="Glow color">
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Glow color</DropdownMenuLabel>
        {colors.map((value) => (
          <DropdownMenuItem key={value} onClick={() => select(value)} aria-label={`${value} glow`}>
            <span className={`glow-swatch glow-swatch-${value}`} aria-hidden="true" />
            <span className="flex-1 capitalize">{value}</span>
            {color === value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}