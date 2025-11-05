import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    
    const rackNumber = searchParams.get("rackNumber");
    const projectId = searchParams.get("projectId");
    const productId = searchParams.get("productId");
    
    if (!rackNumber || !projectId || !productId) {
      return NextResponse.json(
        { error: "Missing required parameters: rackNumber, projectId, and productId are required" },
        { status: 400 }
      );
    }
    
    
    const rackStockOnHold = await db.collection("rackStockOnHold").findOne({
      rackNumber: rackNumber,
      projectId: new ObjectId(projectId),
      productId: new ObjectId(productId)
    });
    
    
    const projectStockOnHold = await db.collection("stockOnHold").findOne({
      projectId: new ObjectId(projectId),
      productId: new ObjectId(productId)
    });
    
    return NextResponse.json({
      rackStockOnHold: rackStockOnHold?.heldQuantity || 0,
      projectStockOnHold: projectStockOnHold?.heldQuantity || 0,
      success: true
    });
    
  } catch (error) {
    console.error("Error fetching rack stock on hold:", error);
    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}
