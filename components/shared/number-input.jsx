import React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";

const NumberInput = ({
  value = 0,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  className,
  disabled = false,
  ...props
}) => {
  const handleDecrease = () => {
    const newValue = Math.max(min, (value || 0) - step);
    onChange?.(newValue);
  };

  const handleIncrease = () => {
    const newValue = Math.min(max, (value || 0) + step);
    onChange?.(newValue);
  };

  const handleInputChange = (e) => {
    let newValue = parseInt(e.target.value, 10);
    if (isNaN(newValue)) newValue = min;
    const clampedValue = Math.max(min, Math.min(max, newValue));
    onChange?.(clampedValue);
  };
  return (
    <div
      className={cn(
        "relative flex items-center h-12 min-h-12 border border-input rounded-md bg-transparent overflow-hidden",
        "w-full max-w-full", // prevent shrink and width jumps
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      <button
        type="button"
        onClick={handleDecrease}
        className="flex items-center justify-center w-8 h-full transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
        disabled={disabled || value <= min}
      >
        <Minus size={16} />
      </button>

      <Input
        type="number"
        value={value}
        onChange={handleInputChange}
        className="flex-1 h-full text-center bg-transparent border-0 outline-none text-base font-normal [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />

      <button
        type="button"
        onClick={handleIncrease}
        className="flex items-center justify-center w-8 h-full transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
        disabled={disabled || value >= max}
      >
        <Plus size={16} />
      </button>
    </div>
  );
};

export default NumberInput;
