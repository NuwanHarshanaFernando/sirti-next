import React, { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { ChevronDownIcon } from "lucide-react";

const SecondaryMultiSelect = ({
  label,
  placeholder = "Select options",
  value = [],
  onValueChange,
  name,
  id,
  className = "",
  required = false,
  disabled = false,
  options = [],
  ...props
}) => {
  const [open, setOpen] = useState(false);
  const [maxVisibleItems, setMaxVisibleItems] = useState(3);
  const selectId = id || name || "secondary-multi-select";

  useEffect(() => {
    const updateMaxItems = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setMaxVisibleItems(1);
      } else if (width < 768) {
        setMaxVisibleItems(2);
      } else if (width < 1024) {
        setMaxVisibleItems(2);
      } else {
        setMaxVisibleItems(3);
      }
    };

    updateMaxItems();
    window.addEventListener("resize", updateMaxItems);
    return () => window.removeEventListener("resize", updateMaxItems);
  }, []);

  const handleValueChange = (optionValue, checked) => {
    let newValue;
    if (checked) {
      newValue = [...value, optionValue];
    } else {
      newValue = value.filter((val) => val !== optionValue);
    }
    onValueChange?.(newValue);
  };

  const removeValue = (optionValue) => {
    const newValue = value.filter((val) => val !== optionValue);
    onValueChange?.(newValue);
  };

  const getSelectedLabels = () => {
    return options
      .filter((option) => value.includes(option.value))
      .map((option) => option.label);
  };

  const selectedLabels = getSelectedLabels();
  return (
    <div className={`relative w-full z-20 ${className}`}>
      <Label
        htmlFor={selectId}
        className="absolute bg-white px-1 text-start w-fit -top-1.5 left-3 z-30"
      >
        {label}
        {required && <span className="-ml-1 text-red-500">*</span>}
      </Label>

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="multiSelect"
            role="combobox"
            aria-expanded={open}
            className="!h-12 w-full justify-between text-left font-normal"
            disabled={disabled}
            id={selectId}
            name={name}
            {...props}
          >            <div className="flex flex-wrap flex-1 gap-1 overflow-hidden">
              {selectedLabels.length === 0 ? (
                <p className="!text-sm text-muted-foreground">{placeholder}</p>
              ) : selectedLabels.length <= maxVisibleItems ? (
                <p className="!text-sm">
                  {selectedLabels.join(", ")}
                </p>
              ) : (
                <div
                  variant="secondary"
                  className="flex flex-row items-center justify-center h-8 px-2 text-sm"
                >
                  {selectedLabels.length} Projects Selected
                </div>
              )}
            </div>
            <ChevronDownIcon className="opacity-50 size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[var(--radix-dropdown-menu-trigger-width)] z-40 bg-white"
          align="start"
        >
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={value.includes(option.value)}
              onCheckedChange={(checked) =>
                handleValueChange(option.value, checked)
              }
              className="flex items-center gap-2"
            >
              {option.color && (
                <div
                  className="flex-shrink-0 w-3 h-3 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
              )}
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
          {options.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No options available
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default SecondaryMultiSelect;
