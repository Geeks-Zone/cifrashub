import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NumberStepperProps {
  value: ReactNode;
  label: string;
  icon?: ReactNode;
  onDecrement: () => void;
  onIncrement: () => void;
}

/**
 * Controle reutilizável de incremento/decremento numérico.
 * Movido de display-settings.tsx (era privado) para uso em qualquer lugar.
 */
export function NumberStepper({
  value,
  label,
  icon,
  onDecrement,
  onIncrement,
}: NumberStepperProps) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <span className="flex items-center gap-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {icon}
        {label}
      </span>
      <div className="flex items-center justify-between rounded-xl bg-background p-1 ring-1 ring-border">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-10"
          onClick={onDecrement}
          aria-label={`Diminuir ${label}`}
        >
          <Minus className="size-4" />
        </Button>
        <span className="text-sm font-bold text-foreground">{value}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-10"
          onClick={onIncrement}
          aria-label={`Aumentar ${label}`}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
