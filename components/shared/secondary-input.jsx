import React from "react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";
import { Plus, Minus, Download, RefreshCw } from "lucide-react";
import CameraScanDialog from "./camera-scan-dialog";

const SecondaryInput = ({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  name,
  id,
  className = "",
  required = false,
  disabled = false,
  error,
  showQrScanner = false,
  showNumberButtons = false,
  showDownload = false,
  showSparkles = false,
  onScan,
  onDownload,
  onSparkles,
  enableActionsWhenDisabled = false,
  ...props
}) => {
  const inputId = id || name || "secondary-input";
  const isActionDisabled = disabled && !enableActionsWhenDisabled ? true : false;

  const handleIncrement = () => {
    if (onChange && !disabled) {
      const currentValue = parseFloat(value) || 0;
      const event = {
        target: {
          name: name,
          value: (currentValue + 1).toString(),
        },
      };
      onChange(event);
    }
  };

  const handleDecrement = () => {
    if (onChange && !disabled) {
      const currentValue = parseFloat(value) || 0;
      const newValue = Math.max(0, currentValue - 1); 
      const event = {
        target: {
          name: name,
          value: newValue.toString(),
        },
      };
      onChange(event);
    }
  };

  return (
    <div className={`relative z-20 w-full ${className}`}>
      <Label
        htmlFor={inputId}
        className="absolute -top-1.5 left-3 z-30 px-1 bg-white text-start w-fit"
      >
        {label}
        {required && <span className="-ml-1 text-red-500">*</span>}
      </Label>

      {type === "textarea" ? (        <Textarea
          id={inputId}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}          className={cn(
            showQrScanner && showDownload && showSparkles && "pr-32",
            showQrScanner && showDownload && !showSparkles && "pr-24",
            showQrScanner && !showDownload && showSparkles && "pr-20",
            showDownload && !showQrScanner && showSparkles && "pr-20",
            showQrScanner && !showDownload && !showSparkles && "pr-10",
            showDownload && !showQrScanner && !showSparkles && "pr-10",
            showSparkles && !showQrScanner && !showDownload && "pr-10"
          )}
          {...props}
        />
      ) : (        <Input
          type={type}
          id={inputId}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}          className={cn(
            showQrScanner && showDownload && showSparkles && "pr-32",
            showQrScanner && showDownload && !showSparkles && "pr-24",
            showQrScanner && !showDownload && showSparkles && "pr-20",
            showDownload && !showQrScanner && showSparkles && "pr-20",
            showQrScanner && !showDownload && !showSparkles && "pr-10",
            showDownload && !showQrScanner && !showSparkles && "pr-10",
            showSparkles && !showQrScanner && !showDownload && "pr-10",
            showNumberButtons && "pr-16",
            showNumberButtons &&
              type === "number" &&
              "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]",
            // File input alignment tweaks: keep text left and vertically centered
            type === "file" && "py-0 file:h-10 file:px-0 file:pb-0 file:pt-2 file:inline-flex file:items-center file:justify-center file:text-left"
          )}
          {...props}
        />
      )}
      {showNumberButtons && (
        <div className="flex absolute right-2 top-1/2 flex-row gap-1 -translate-y-1/2 z-30">
          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled}
            className={cn(
              "w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors",
              disabled &&
                "text-gray-300 cursor-not-allowed hover:bg-transparent"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled}
            className={cn(
              "w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors",
              disabled &&
                "text-gray-300 cursor-not-allowed hover:bg-transparent"
            )}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {showQrScanner && (
        <CameraScanDialog
          onScan={onScan}
          className={cn(
            "absolute w-5 h-5 text-gray-400 transform cursor-pointer -translate-y-1/2 top-1/2 z-20 pointer-events-auto",
            showDownload && showSparkles ? "right-16" : 
            showDownload && !showSparkles ? "right-10" :
            !showDownload && showSparkles ? "right-10" : "right-3",
            disabled && "text-gray-300"
          )}
        />
      )}
      {showDownload && (
        <button
          type="button"
          onClick={onDownload}
          disabled={isActionDisabled}
          className={cn(
            "absolute w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer transform -translate-y-1/2 top-1/2 transition-colors z-20 pointer-events-auto",
            showSparkles ? "right-9" : "right-3",
            isActionDisabled && "text-gray-300 cursor-not-allowed hover:text-gray-300"
          )}
        >
          <Download className="w-full h-full" />
        </button>
      )}
      {showSparkles && (
        <button
          type="button"
          onClick={onSparkles}
          disabled={disabled}
          className={cn(
            "absolute w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer transform -translate-y-1/2 right-3 top-1/2 transition-colors",
            disabled && "text-gray-300 cursor-not-allowed hover:text-gray-300"
          )}
        >
          <RefreshCw className="w-full h-full" />
        </button>
      )}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default SecondaryInput;
