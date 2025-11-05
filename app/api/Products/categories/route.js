import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";


export async function GET() {
  try {
    const { db } = await connectToDatabase();
    
    
    const categories = await db.collection("products").distinct("category");
    
    
    const validCategories = categories.filter(
      category => category && category.trim() !== ""
    );
    
    
    const categoryOptions = validCategories.map(category => ({
      value: category,
      label: category
    }));
    
    return NextResponse.json({ categories: categoryOptions });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}


export async function POST(req) {
  try {
    const { db } = await connectToDatabase();
    const { category } = await req.json();
    
    
    if (!category || category.trim() === "") {
      return NextResponse.json({ error: "Category cannot be empty" }, { status: 400 });
    }
    
    
    const existingCategory = await db.collection("products").findOne({ category });
    
    if (existingCategory) {
      return NextResponse.json({ 
        message: "Category already exists",
        category: {
          value: category,
          label: category
        }
      });
    }
    
    
    
    return NextResponse.json({ 
      message: "Category added successfully",
      category: {
        value: category,
        label: category
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error adding category:", error);
    return NextResponse.json({ error: "Failed to add category" }, { status: 500 });
  }
}
