
import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function POST(req) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const {
      productId,
      projectId,
      newStock,
      adjustmentReason,
      racks = []
    } = body;

    
    if (!productId || !projectId || newStock === undefined) {
      return NextResponse.json(
        { error: "productId, projectId, and newStock are required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(productId) || !ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { error: "Invalid productId or projectId" },
        { status: 400 }
      );
    }

    
    const project = await db.collection("Projects").findOne({
      _id: new ObjectId(projectId)
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    
    const product = await db.collection("products").findOne({ _id: new ObjectId(productId) });
    if (product && Array.isArray(product.includedProjects) && product.includedProjects.length > 0 && !product.includedProjects.some(pid => pid.toString() === projectId)) {
      return NextResponse.json({ error: "This project is not included for managing this product." }, { status: 403 });
    }

    
    const result = await db.collection("Projects").updateOne(
      { 
        _id: new ObjectId(projectId),
        "products.productObjId": new ObjectId(productId)
      },
      { 
        $set: { 
          "products.$.stocks": parseInt(newStock),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Product not found in the specified project" },
        { status: 404 }
      );
    }

    
    if (adjustmentReason) {
      await db.collection("stockAdjustments").insertOne({
        productId: new ObjectId(productId),
        projectId: new ObjectId(projectId),
        previousStock: null, 
        newStock: parseInt(newStock),
        adjustmentReason,
        racks: racks.map(rackId => new ObjectId(rackId)),
        createdAt: new Date(),
      });
    }

    return NextResponse.json({
      message: "Stock updated successfully",
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("Error updating stock:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
