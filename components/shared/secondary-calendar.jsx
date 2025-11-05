"use client";
import React from "react";
import { Label } from "../ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Button } from "../ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "../ui/calendar";

const SecondaryCalendar = ({
  label,
  placeholder,
  value,
  onValueChange,
  name,
  id,
  className = "",
  required = false,
  disabled = false,
  mode = "single",
  error,
  ...props
}) => {
  const inputId = id || name || "secondary-calendar";

  const formatValue = () => {
    if (!value) return placeholder;
    if (mode === "single") {
      return value instanceof Date
        ? value.toLocaleDateString()
        : placeholder;
    }
    // range mode
    if (value.from && value.to) {
      return `${value.from.toLocaleDateString()} - ${value.to.toLocaleDateString()}`;
    }
    if (value.from) {
      return `${value.from.toLocaleDateString()}`;
    }
    return placeholder;
  };

  return (
    <div className={`relative w-full z-20 ${className}`}>
      <Label
        htmlFor={inputId}
        className="absolute bg-white px-1 text-start w-fit -top-1.5 left-3 z-30"
      >
        {label}
        {required && <span className="-ml-1 text-red-500">*</span>}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="secondaryOutline"
            size="secondary"
            id={inputId}
            name={name}
            disabled={disabled}
            className="!h-12 w-full flex items-center justify-start gap-2 font-normal border"
          >
            <CalendarIcon />
            <span className="flex-1 text-left">{formatValue()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="z-40 p-0 overflow-hidden bg-white" align="start">
          <Calendar
            mode={mode}
            selected={value}
            onSelect={onValueChange}
            {...props}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default SecondaryCalendar;
