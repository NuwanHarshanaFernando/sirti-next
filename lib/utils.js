import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value) {
  if (value === null || value === undefined) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString();
}

// Safely format a date with toLocaleString
export function formatDate(dateValue, fallback = "Unknown Date") {
  if (!dateValue) return fallback;
  
  try {
    const date = new Date(dateValue);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return fallback;
    }
    return date.toLocaleString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return fallback;
  }
}
