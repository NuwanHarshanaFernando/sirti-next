"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function MultiCombobox({
  options = [],
  value,
  onValueChange,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  className,
  icon: CustomIcon = ChevronsUpDown,
  loading = false,
  onSearchChange,
  maxDisplay = 2,
  ...props
}) {
  const [open, setOpen] = React.useState(false);
  const [triggerWidth, setTriggerWidth] = React.useState(0);
  const [searchValue, setSearchValue] = React.useState("");
  const triggerRef = React.useRef(null);

  const selectedValues = React.useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return value
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v);
  }, [value]);

  const handleValueChange = React.useCallback(
    (newValues) => {
      const valueString = Array.isArray(newValues)
        ? newValues.join(",")
        : newValues;
      onValueChange?.(valueString);
    },
    [onValueChange]
  );

  React.useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  const handleSearchChange = (value) => {
    setSearchValue(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const handleSelect = (selectedValue) => {
    const newValues = selectedValues.includes(selectedValue)
      ? selectedValues.filter((v) => v !== selectedValue)
      : [...selectedValues, selectedValue];

    handleValueChange(newValues);
  };

  const removeValue = (valueToRemove) => {
    const newValues = selectedValues.filter((v) => v !== valueToRemove);
    handleValueChange(newValues);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;

    if (selectedValues.length <= maxDisplay) {
      const labels = selectedValues.map((val) => {
        const option = options.find((opt) => opt.value === val);
        return option?.label || val;
      });
      return labels.join(", ");
    }

    return `${selectedValues.length} categories selected`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="secondaryOutline"
          size="secondary"
          role="combobox"
          aria-expanded={open}
          className={cn("min-w-[100px] justify-between px-3", className)}
          {...props}
        >
          <p className="!text-sm truncate capitalize">{getDisplayText()}</p>
          <CustomIcon className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 bg-white"
        style={{ width: triggerWidth || 200 }}
      >
        <Command>
          {searchPlaceholder && (
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={handleSearchChange}
            />
          )}
          <CommandList>
            {!loading && <CommandEmpty>{emptyText}</CommandEmpty>}
            <CommandGroup>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#e5e7eb"
                      strokeWidth="2"
                    />
                    <path
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      fill="#3b82f6"
                    />
                  </svg>
                </div>
              ) : (
                options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedValues.includes(option.value)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))
              )}
            </CommandGroup>{" "}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
