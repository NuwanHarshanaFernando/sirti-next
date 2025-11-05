import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Product from "@/lib/models/Products";

export async function GET() {
  try {
    console.log("Units API endpoint called");
    await connectToDatabase();
    
    
    const units = await Product.distinct("unit");
    
    
    const filteredUnits = units.filter(unit => unit && unit !== "");
    
    
    const formattedUnits = filteredUnits.map(unit => ({
      value: unit.toLowerCase(),
      label: unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase()
    }));
    
    
    const defaultUnits = [
      { value: "pcs", label: "Pieces" },
      { value: "kg", label: "Kilograms" },
      { value: "l", label: "Liters" },
      { value: "m", label: "Meters" },
      { value: "box", label: "Box" },
      { value: "pack", label: "Pack" },
      { value: "bottle", label: "Bottle" },
      { value: "can", label: "Can" },
      { value: "g", label: "Grams" },
      { value: "ml", label: "Milliliters" },
      { value: "cm", label: "Centimeters" },
      { value: "mm", label: "Millimeters" },
      { value: "ft", label: "Feet" },
      { value: "in", label: "Inches" },
      { value: "sq m", label: "Square Meters" },
      { value: "cu m", label: "Cubic Meters" },
      { value: "set", label: "Set" },
      { value: "pair", label: "Pair" },
      { value: "dozen", label: "Dozen" },
      { value: "roll", label: "Roll" }
    ];
    
    
    const allUnits = [...formattedUnits];
    
    
    defaultUnits.forEach(defaultUnit => {
      if (!allUnits.some(unit => unit.value.toLowerCase() === defaultUnit.value.toLowerCase())) {
        allUnits.push(defaultUnit);
      }
    });
    
    
    allUnits.sort((a, b) => a.label.localeCompare(b.label));
    
    return NextResponse.json({ units: allUnits });
  } catch (error) {
    console.error("Error fetching units:", error);
    
    const defaultUnits = [
      { value: "pcs", label: "Pieces" },
      { value: "kg", label: "Kilograms" },
      { value: "l", label: "Liters" },
      { value: "box", label: "Box" },
      { value: "pack", label: "Pack" }
    ];
    return NextResponse.json({ 
      units: defaultUnits, 
      error: "Failed to fetch units from database, returning defaults" 
    });
  }
}
