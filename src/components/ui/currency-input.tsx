import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CurrencyInput({ value, onChange, placeholder = "R$ 0", className }: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);

  const formatted =
    value !== "" && !isNaN(parseFloat(value))
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0,
        }).format(parseFloat(value))
      : "";

  return (
    <Input
      type={focused ? "number" : "text"}
      value={focused ? value : formatted}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      className={cn(className)}
      min={0}
      step={1}
    />
  );
}
