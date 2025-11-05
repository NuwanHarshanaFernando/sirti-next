"use client";
import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"; 

export default function SecondaryDatePicker({ label, onDateRangeChange, dateRange, mode = "range", placeholder = "Filter By DATES", id, name, required = false, disabled = false, error, className = "" }) {
  const inputId = id || name || "secondary-date-picker";

  const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

  const normalizeDateToLocalNoon = (date) => {
    if (!date) return undefined;
    const d = date instanceof Date ? new Date(date) : new Date(String(date));
    if (!isValidDate(d)) return undefined;
    d.setHours(12, 0, 0, 0);
    return d;
  };

  const normalizeValue = (value) => {
    if (!value) return undefined;
    if (mode === "single") {
      return normalizeDateToLocalNoon(value) || undefined;
    }
    const from = value && value.from ? normalizeDateToLocalNoon(value.from) : undefined;
    const to = value && value.to ? normalizeDateToLocalNoon(value.to) : undefined;
    if (from || to) return { from, to };
    return undefined;
  };

  const [range, setRange] = React.useState(normalizeValue(dateRange) || undefined)

  const handleRangeChange = (newRange) => {
    const normalized = normalizeValue(newRange);
    setRange(normalized);
    if (onDateRangeChange) {
      onDateRangeChange(normalized);
    }
  };

  React.useEffect(() => {
    setRange(normalizeValue(dateRange));
  }, [dateRange]);

  const getButtonText = () => {
    if (mode === "single") {
      return range ? range.toLocaleDateString() : placeholder;
    } else {
      return range?.from && range?.to
        ? `${range.from.toLocaleDateString()} - ${range.to.toLocaleDateString()}`
        : range?.from
        ? `${range.from.toLocaleDateString()}`
        : placeholder;
    }
  };

  return (
    <div className={cn("relative z-20 w-full", className)}>
      {label && (
        <Label htmlFor={inputId} className="absolute -top-1.5 left-3 z-30 px-1 bg-white text-start w-fit">
          {label}
          {required && <span className="-ml-1 text-red-500">*</span>}
        </Label>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={inputId}
            type="button"
            variant="secondaryOutline"
            disabled={disabled}
            className={cn(
              "flex items-center justify-start w-full border !h-12 font-normal rounded-md",
              disabled && "cursor-not-allowed"
            )}
          >
            <CalendarIcon className="mr-2" />
            {getButtonText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="overflow-hidden p-0 w-auto" align="start">
          <Calendar
            mode={mode}
            selected={range}
            captionLayout="dropdown"
            onSelect={handleRangeChange}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
