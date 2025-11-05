import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(req, { params }) {
  try {
    const { id } = params;
    
    
    
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid Rack ID format" },
        { status: 400 }
      );
    }
    
    const { db } = await connectToDatabase();
    
    
    let rack = await db
      .collection("racks")
      .findOne({ _id: new ObjectId(id) });
      
    if (!rack) {
      rack = await db
        .collection("Racks")
        .findOne({ _id: new ObjectId(id) });
    }
    
    if (!rack) {
      return NextResponse.json(
        { error: "Rack not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ rack });
  } catch (error) {
    console.error("Error fetching rack by ID:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
