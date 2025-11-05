"use client";
import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const DatePicker = () => {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(undefined);
  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="date" className="px-1">
        Date of birth
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className="justify-between w-48 font-normal"
          >
            {date ? date.toLocaleDateString() : "Select date"}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
          <Calendar
            mode="single"
            defaultMonth={date}
            numberOfMonths={2}
            selected={date}
            onSelect={setDate}
            className="border rounded-lg shadow-sm"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DatePicker;
