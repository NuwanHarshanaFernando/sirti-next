import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    
    const body = await request.json();
    const {
      productId,
      projectId,
      projectName,
      rackNumber,
      stockOnHand,
      stockOnHold,
      reason,
      adminUser,
    } = body;

    
    if (!productId || !projectId || !rackNumber || !reason) {
      return NextResponse.json(
        { error: "Product ID, Project ID, Rack Number, and reason are required" },
        { status: 400 }
      );
    }

    
    const validatedStockOnHand = Math.max(0, parseInt(stockOnHand) || 0);
    const validatedStockOnHold = Math.max(0, parseInt(stockOnHold) || 0);

    console.log("Admin direct rack stock update:", {
      productId,
      projectId,
      rackNumber,
      stockOnHand: validatedStockOnHand,
      stockOnHold: validatedStockOnHold,
      reason,
      adminUser
    });

    const { db } = await connectToDatabase();

    
    const project = await db.collection("Projects").findOne({
      _id: new ObjectId(projectId),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    
    const product = await db.collection("products").findOne({
      _id: new ObjectId(productId),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    
    const rack = await db.collection("racks").findOne({
      rackNumber: rackNumber,
    });

    if (!rack) {
      return NextResponse.json({ error: "Rack not found" }, { status: 404 });
    }

    
    const productInRack = rack.products?.find(
      (p) => p.product.toString() === productId
    );

    
    if (productInRack) {
      
      await db.collection("racks").updateOne(
        {
          _id: rack._id,
          "products.product": new ObjectId(productId),
        },
        {
          $set: {
            "products.$.stock": validatedStockOnHand,
            updatedAt: new Date(),
          },
        }
      );
    } else if (validatedStockOnHand > 0) {
      
      await db.collection("racks").updateOne(
        { _id: rack._id },
        {
          $addToSet: {
            products: {
              product: new ObjectId(productId),
              stock: validatedStockOnHand,
            },
          },
          $set: { updatedAt: new Date() },
        }
      );
    }

    
    if (validatedStockOnHold > 0) {
      await db.collection("rackStockOnHold").replaceOne(
        {
          rackNumber: rackNumber,
          projectId: new ObjectId(projectId),
          productId: new ObjectId(productId),
        },
        {
          rackNumber: rackNumber,
          projectId: new ObjectId(projectId),
          productId: new ObjectId(productId),
          heldQuantity: validatedStockOnHold,
          updatedAt: new Date(),
          updatedBy: adminUser,
        },
        { upsert: true }
      );
    } else {
      
      await db.collection("rackStockOnHold").deleteOne({
        rackNumber: rackNumber,
        projectId: new ObjectId(projectId),
        productId: new ObjectId(productId),
      });
    }

    
    const allRackHolds = await db.collection("rackStockOnHold").find({
      projectId: new ObjectId(projectId),
      productId: new ObjectId(productId),
    }).toArray();

    const totalHeldQuantity = allRackHolds.reduce((total, hold) => total + hold.heldQuantity, 0);

    
    if (totalHeldQuantity > 0) {
      await db.collection("stockOnHold").replaceOne(
        {
          projectId: new ObjectId(projectId),
          productId: new ObjectId(productId),
        },
        {
          projectId: new ObjectId(projectId),
          productId: new ObjectId(productId),
          heldQuantity: totalHeldQuantity,
          updatedAt: new Date(),
          updatedBy: adminUser,
        },
        { upsert: true }
      );
    } else {
      await db.collection("stockOnHold").deleteOne({
        projectId: new ObjectId(projectId),
        productId: new ObjectId(productId),
      });
    }

    
    await db.collection("adminActions").insertOne({
      action: "direct_rack_stock_update",
      adminUser: adminUser,
      productId: new ObjectId(productId),
      productName: product.productName,
      projectId: new ObjectId(projectId),
      projectName: projectName,
      rackNumber: rackNumber,
      stockOnHand: validatedStockOnHand,
      stockOnHold: validatedStockOnHold,
      reason: reason,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Rack stock updated successfully",
      data: {
        productName: product.productName,
        projectName: projectName,
        rackNumber: rackNumber,
        stockOnHand: validatedStockOnHand,
        stockOnHold: validatedStockOnHold,
      },
    });
  } catch (error) {
    console.error("Error in direct rack stock update:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}
