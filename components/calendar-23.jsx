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

export default function Calendar23({
  value,
  onValueChange,
  dateRange,
  onDateRangeChange,
  mode = "range",
  placeholder = "Filter By DATES"
}) {
  const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

  const normalizeDateToLocalNoon = (date) => {
    if (!date) return undefined;
    const d = date instanceof Date ? new Date(date) : new Date(String(date));
    if (!isValidDate(d)) return undefined;
    d.setHours(12, 0, 0, 0);
    return d;
  };

  const normalizeValue = (val) => {
    if (!val) return undefined;
    if (mode === "single") {
      return normalizeDateToLocalNoon(val) || undefined;
    }
    const from = val && val.from ? normalizeDateToLocalNoon(val.from) : undefined;
    const to = val && val.to ? normalizeDateToLocalNoon(val.to) : undefined;
    if (from || to) return { from, to };
    return undefined;
  };

  const [internalValue, setInternalValue] = React.useState(
    mode === "single" ? normalizeValue(value) : normalizeValue(dateRange)
  );

  React.useEffect(() => {
    if (mode === "single") setInternalValue(normalizeValue(value));
    else setInternalValue(normalizeValue(dateRange));
  }, [value, dateRange, mode]);

  const handleChange = (newVal) => {
    const normalized = normalizeValue(newVal);
    setInternalValue(normalized);
    if (mode === "single") {
      if (onValueChange) onValueChange(normalized);
    } else {
      if (onDateRangeChange) onDateRangeChange(normalized);
    }
  };

  const getButtonText = () => {
    if (mode === "single") {
      return internalValue && isValidDate(internalValue)
        ? internalValue.toLocaleDateString()
        : placeholder;
    } else {
      const from = internalValue && internalValue.from;
      const to = internalValue && internalValue.to;
      return from && to
        ? `${from.toLocaleDateString()} - ${to.toLocaleDateString()}`
        : from
        ? `${from.toLocaleDateString()}`
        : placeholder;
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondaryOutline" id="dates" size="secondary" className="justify-start items-center w-full font-normal">
            <CalendarIcon />
            {getButtonText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="overflow-hidden p-0 w-auto" align="start">
          <Calendar
            mode={mode}
            selected={internalValue}
            captionLayout="dropdown"
            onSelect={handleChange}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
