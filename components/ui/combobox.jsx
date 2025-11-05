"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";

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

export function Combobox({
  options = [],
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  className,
  icon: CustomIcon = ChevronsUpDown,
  loading = false,
  onSearchChange,
  ...props
}) {
  const [open, setOpen] = React.useState(false);
  const [triggerWidth, setTriggerWidth] = React.useState(0);
  const [searchValue, setSearchValue] = React.useState('');
  const triggerRef = React.useRef(null);

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
          <p className="!text-sm truncate capitalize">
            {value
              ? options.find((option) => option.value === value)?.label
              : placeholder}
          </p>
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
                      d="M12 2a10 10 0 0 1 10 10" 
                      stroke="#0b817f" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                    />
                  </svg>
                  <p className="ml-2 text-base text-gray-500">Loading...</p>
                </div>
              ) : (
                options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    disabled={option.disabled}
                    onSelect={(currentValue) => {
                      if (option.disabled) return;
                      // Find the option by label to get the actual value
                      const selectedOption = options.find(opt => opt.label === currentValue);
                      const selectedValue = selectedOption ? selectedOption.value : currentValue;
                      onValueChange?.(selectedValue === value ? "" : selectedValue);
                      setOpen(false);
                    }}
                    className={cn(
                      value === option.value ? "bg-blue-50/80" : "",
                      option.disabled
                        ? "opacity-50 text-gray-400 cursor-not-allowed"
                        : "",
                      option.className
                    )}
                  >
                    {option.label}
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
