import React, { forwardRef } from "react";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import CameraScanDialog from "./camera-scan-dialog";

const SearchBarcode = forwardRef(({
  placeholder = "SEARCH CATEGORY/PROJECT",
  value,
  onChange,
  onKeyDown,
  onScan,
  className,
  iconClassName,
  disabled = false,
  ...props
}, ref) => {
  return (
    <div className="relative" ref={ref}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={disabled}
        className={cn(
          "h-10 pr-10 border-2 border-black/10 placeholder:uppercase",
          className
        )}
        {...props}
      />
      <CameraScanDialog
        onScan={onScan}
        className={cn(
          "absolute w-6 h-6 text-gray-400 transform cursor-pointer -translate-y-1/2 right-3 top-1/2",
          disabled && "text-gray-300",
          iconClassName
        )}
      />
    </div>
  );
});

SearchBarcode.displayName = "SearchBarcode";

export default SearchBarcode;
