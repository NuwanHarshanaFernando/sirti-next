import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(req) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const projectId = searchParams.get("projectId");

    let query = {};

    if (productId) {
      query.productId = new ObjectId(productId);
    }

    if (projectId) {
      query.projectId = new ObjectId(projectId);
    }

    
    const stockOnHoldRecords = await db.collection("stockOnHold").find(query).toArray();

    
    if (productId && projectId) {
      const record = stockOnHoldRecords.find(
        record => 
          record.productId.toString() === productId && 
          record.projectId.toString() === projectId
      );
      
      return NextResponse.json({
        heldQuantity: record ? record.heldQuantity : 0,
        success: true,
      });
    }

    
    return NextResponse.json({
      stockOnHold: stockOnHoldRecords,
      count: stockOnHoldRecords.length,
      success: true,
    });
  } catch (error) {
    console.error("Stock on hold API error:", error);
    return NextResponse.json(
      {
        error: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}
