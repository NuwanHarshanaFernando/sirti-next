import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";

const SecondarySelect = ({
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
  error,
  ...props
}) => {
  const selectId = id || name || "secondary-select";
  return (
    <div className={`relative w-full z-20 ${className}`}>
      <Label
        htmlFor={selectId}
        className="absolute bg-white px-1 text-start w-fit -top-1.5 left-3 z-30"
      >
        {label}
        {required && <span className="-ml-1 text-red-500">*</span>}
      </Label>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        {...props}
      >
        <SelectTrigger
          className="!h-12 w-full [&_span]:!text-sm"
          id={selectId}
          name={name}
        >
          <SelectValue
            className="!text-sm [&_span]:!text-sm"
            placeholder={placeholder}
          />
        </SelectTrigger>
        <SelectContent className="bg-white z-40 [&_span]:!text-sm">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="!text-sm [&_span]:!text-sm"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default SecondarySelect;
