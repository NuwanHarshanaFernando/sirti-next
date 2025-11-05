import React, { useState } from "react";
import { Label } from "../ui/label";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const SecondarySelectWithCreate = ({
  label,
  placeholder,
  value,
  onValueChange,
  name,
  id,
  className = "",
  required = false,
  disabled = false,
  options = [],
  setOptions = () => {},
  allowCreate = true,
  error,
  ...props
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const selectId = id || name || "secondary-select-with-create";

  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleCreateNew = async (newValue) => {
    if (!newValue || newValue.trim() === '') {
      return;
    }
    
    const normalizedNewValue = newValue.toLowerCase();
    
    if (options.some(opt => opt.value.toLowerCase() === normalizedNewValue)) {
      const existingOption = options.find(opt => opt.value.toLowerCase() === normalizedNewValue);
      onValueChange(existingOption.value);
      setOpen(false);
      setSearchValue("");
      return;
    }
    const formattedValue = newValue.trim();
    const newOption = { 
      value: formattedValue.toLowerCase(), 
      label: formattedValue.charAt(0).toUpperCase() + formattedValue.slice(1).toLowerCase() 
    };

    
    if (label === "Product Category") {
      try {
        const response = await fetch("/api/Products/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ category: formattedValue }),
        });

        if (response.ok) {
          setOptions(prevOptions => [...prevOptions, newOption]);
          onValueChange(newOption.value);
          toast.success(`Added new category: ${newOption.label}`);
        }
      } catch (error) {
        toast.error("Failed to create new category");
      }
    } else {
      setOptions(prevOptions => [...prevOptions, newOption]);
      onValueChange(newOption.value);
      toast.success(`Added new ${label.toLowerCase()}: ${newOption.label}`);
    }
    setOpen(false);
    setSearchValue("");
  };

  const getDisplayValue = () => {
    if (!value) return '';
    
    const exactMatch = options.find(opt => opt.value === value);
    if (exactMatch) return exactMatch.label;
    
    const caseInsensitiveMatch = options.find(opt => 
      opt.value.toLowerCase() === value.toLowerCase()
    );
    if (caseInsensitiveMatch) return caseInsensitiveMatch.label;
    
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  };

  const displayValue = getDisplayValue();

  return (
    <div className={`relative w-full z-20 ${className}`}>
      <Label
        htmlFor={selectId}
        className="absolute bg-white px-1 text-start w-fit -top-1.5 left-3 z-30"
      >
        {label}
        {required && <span className="-ml-1 text-red-500">*</span>}
      </Label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="multiSelect"
            role="combobox"
            aria-expanded={open}
            className="!h-12 w-full justify-between [&_span]:!text-sm "
            id={selectId}
            name={name}
            disabled={disabled}
          >
            <span className="font-normal truncate capitalize">
              {displayValue || placeholder}
            </span>
            <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="z-40 w-[var(--radix-popover-trigger-width)] !p-0 bg-white">
          <Command>
            <CommandInput
              placeholder={`Search ${label?.toLowerCase() || 'options'}...`}
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandEmpty className="p-0">
              {allowCreate && searchValue && (
               
                  <Button
                    variant="ghost"
                    className="justify-start w-full text-sm"
                    onClick={() => handleCreateNew(searchValue)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create "{searchValue}"
                  </Button>
              )}
              {!searchValue && "No options found."}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                    setSearchValue("");
                  }}
                  className="!text-sm [&_span]:!text-sm"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default SecondarySelectWithCreate;
