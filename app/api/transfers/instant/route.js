import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    const {
      productId,
      fromProjectId,
      toProjectId,
      fromRack,
      toRack,
      quantity,
      reason,
      transferredBy,
      type
    } = await request.json();

    

    
    if (!productId || !fromProjectId || !toProjectId || !fromRack || !toRack || !quantity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (fromProjectId === toProjectId) {
      return NextResponse.json(
        { error: "Cannot transfer within the same project" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    
    const sourceRack = await db.collection("racks").findOne({
      rackNumber: fromRack,
      "products.product": new ObjectId(productId)
    });

    if (!sourceRack) {
      return NextResponse.json(
        { error: `Source rack ${fromRack} not found or doesn't contain this product` },
        { status: 400 }
      );
    }

    const sourceProductIndex = sourceRack.products.findIndex(
      p => p.product.toString() === productId
    );

    if (sourceProductIndex === -1 || sourceRack.products[sourceProductIndex].stock < quantity) {
      return NextResponse.json(
        { error: `Insufficient stock in source rack ${fromRack}. Available: ${
          sourceProductIndex !== -1 ? sourceRack.products[sourceProductIndex].stock : 0
        }, Requested: ${quantity}` },
        { status: 400 }
      );
    }

    
    await db.collection("racks").updateOne(
      {
        rackNumber: fromRack,
        "products.product": new ObjectId(productId)
      },
      {
        $inc: { "products.$.stock": -quantity },
        $set: { "products.$.lastUpdated": new Date() }
      }
    );

    
    const destinationRack = await db.collection("racks").findOne({
      rackNumber: toRack
    });

    if (!destinationRack) {
      return NextResponse.json(
        { error: `Destination rack ${toRack} not found` },
        { status: 400 }
      );
    }

    const destinationProductIndex = destinationRack.products?.findIndex(
      p => p.product.toString() === productId
    );

    if (destinationProductIndex !== -1) {
      
      await db.collection("racks").updateOne(
        {
          rackNumber: toRack,
          "products.product": new ObjectId(productId)
        },
        {
          $inc: { "products.$.stock": quantity },
          $set: { "products.$.lastUpdated": new Date() }
        }
      );
    } else {
      
      await db.collection("racks").updateOne(
        {
          rackNumber: toRack
        },
        {
          $push: {
            products: {
              product: new ObjectId(productId),
              stock: quantity,
              lastUpdated: new Date(),
              createdAt: new Date()
            }
          }
        }
      );
    }

    
    const activity = {
      productId: new ObjectId(productId),
      fromProjectId: new ObjectId(fromProjectId),
      toProjectId: new ObjectId(toProjectId),
      fromRack: fromRack,
      toRack: toRack,
      quantity: quantity,
      reason: reason || "Admin instant transfer",
      transferredBy: new ObjectId(transferredBy),
      type: "INSTANT_TRANSFER",
      status: "COMPLETED",
      createdAt: new Date(),
      completedAt: new Date()
    };

    await db.collection("transferActivities").insertOne(activity);

    return NextResponse.json({
      success: true,
      message: "Transfer completed successfully",
      transferId: new ObjectId().toString(),
      details: {
        fromProject: fromProjectId,
        toProject: toProjectId,
        fromRack: fromRack,
        toRack: toRack,
        quantity: quantity
      }
    });

  } catch (error) {
    console.error("❌ Instant transfer API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
