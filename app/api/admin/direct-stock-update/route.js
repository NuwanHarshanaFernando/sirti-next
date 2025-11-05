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
    }    const body = await request.json();
    const {
      productId,
      projectId,
      projectName,
      stockOnHand,
      stockOnHold,
      selectedRack,
      reason,
      adminUser,
    } = body;

    if (!productId || !projectId || !reason) {
      return NextResponse.json(
        { error: "Product ID, Project ID, and reason are required" },
        { status: 400 }
      );
    }

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
    if (project.racks && project.racks.length > 0) {
      const projectRacks = await db
        .collection("racks")
        .find({
          _id: { $in: project.racks.map((rackId) => new ObjectId(rackId)) },
        })
        .toArray();

      
      if (selectedRack) {
        const targetRack = projectRacks.find(rack => rack.rackNumber === selectedRack);
        
        if (targetRack) {
          const productInRack = targetRack.products?.find(
            (p) => p.product.toString() === productId
          );

          if (productInRack) {
            
            await db.collection("racks").updateOne(
              {
                _id: targetRack._id,
                "products.product": new ObjectId(productId),
              },
              {
                $set: {
                  "products.$.stock": parseInt(stockOnHand) || 0,
                  updatedAt: new Date(),
                },
              }
            );
          } else if (parseInt(stockOnHand) > 0) {
            
            await db.collection("racks").updateOne(
              { _id: targetRack._id },
              {
                $addToSet: {
                  products: {
                    product: new ObjectId(productId),
                    stock: parseInt(stockOnHand) || 0,
                  },
                },
                $set: { updatedAt: new Date() },
              }
            );
          }
        }
      } else {
        
        for (const rack of projectRacks) {
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
                  "products.$.stock": parseInt(stockOnHand) || 0,
                  updatedAt: new Date(),
                },
              }
            );
          } else if (parseInt(stockOnHand) > 0) {
            
            await db.collection("racks").updateOne(
              { _id: rack._id },
              {
                $addToSet: {
                  products: {
                    product: new ObjectId(productId),
                    stock: parseInt(stockOnHand) || 0,
                  },
                },
                $set: { updatedAt: new Date() },
              }
            );
            break; 
          }
        }
      }
    }

    
    if (parseInt(stockOnHold) >= 0) {
      
      await db.collection("stockOnHold").replaceOne(
        {
          projectId: new ObjectId(projectId),
          productId: new ObjectId(productId),
        },
        {
          projectId: new ObjectId(projectId),
          productId: new ObjectId(productId),
          heldQuantity: parseInt(stockOnHold),
          updatedAt: new Date(),
          updatedBy: adminUser,
        },
        { upsert: true }
      );
      
      
      if (selectedRack) {
        if (parseInt(stockOnHold) > 0) {
          await db.collection("rackStockOnHold").replaceOne(
            {
              rackNumber: selectedRack,
              projectId: new ObjectId(projectId),
              productId: new ObjectId(productId),
            },
            {
              rackNumber: selectedRack,
              projectId: new ObjectId(projectId),
              productId: new ObjectId(productId),
              heldQuantity: parseInt(stockOnHold),
              updatedAt: new Date(),
              updatedBy: adminUser,
            },
            { upsert: true }
          );
        } else {
          
          await db.collection("rackStockOnHold").deleteOne({
            rackNumber: selectedRack,
            projectId: new ObjectId(projectId),
            productId: new ObjectId(productId),
          });
        }
      }
    } else {
      
      await db.collection("stockOnHold").deleteOne({
        projectId: new ObjectId(projectId),
        productId: new ObjectId(productId),
      });
      
      if (selectedRack) {
        await db.collection("rackStockOnHold").deleteOne({
          rackNumber: selectedRack,
          projectId: new ObjectId(projectId),
          productId: new ObjectId(productId),
        });
      }
    }    
    await db.collection("adminActions").insertOne({
      action: "direct_stock_update",
      adminUser: adminUser,
      productId: new ObjectId(productId),
      productName: product.productName,
      projectId: new ObjectId(projectId),
      projectName: projectName,
      stockOnHand: parseInt(stockOnHand) || 0,
      stockOnHold: parseInt(stockOnHold) || 0,
      selectedRack: selectedRack || null,
      reason: reason,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Stock updated successfully",
      data: {
        productName: product.productName,
        projectName: projectName,
        stockOnHand: parseInt(stockOnHand) || 0,
        stockOnHold: parseInt(stockOnHold) || 0,
      },
    });
  } catch (error) {
    console.error("Error in direct stock update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
