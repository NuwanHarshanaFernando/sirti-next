import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { broadcastNotification } from "@/lib/notification-broadcaster";

export async function POST(req, { params }) {
  try {
    const { id } = params;
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid transaction ID" },
        { status: 400 }
      );
    }
    
    
    const transaction = await db.collection("stocktransactions").findOne({
      _id: new ObjectId(id)
    });
    
    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
    
    if (transaction.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending transactions can be approved" },
        { status: 400 }
      );
    }
    
    
    const items = transaction.items || [];
    const errors = [];
    
    for (const item of items) {
      try {
        const { productId, rackId, quantity } = item;
        
        if (!productId || !rackId || !quantity) {
          errors.push(`Missing required fields in item`);
          continue;
        }
        
        
        // Resolve rack from either "racks" or legacy "Racks" collection
        let rack = await db.collection("racks").findOne({
          _id: new ObjectId(rackId.toString())
        });
        let racksCollectionName = "racks";
        if (!rack) {
          const legacyRack = await db.collection("Racks").findOne({
            _id: new ObjectId(rackId.toString())
          });
          if (legacyRack) {
            rack = legacyRack;
            racksCollectionName = "Racks";
          }
        }
        
        if (!rack) {
          errors.push(`Rack with ID ${rackId} not found`);
          continue;
        }
        
        
        const productIdStr = productId.toString();
        // Robust match: p.product may be ObjectId, string, or embedded object with _id
        const productInRack = (rack.products || []).find((p) => {
          const val = p?.product;
          if (!val) return false;
          if (typeof val === 'string') return val === productIdStr;
          try {
            if (val && typeof val === 'object' && typeof val.toString === 'function' && val.toString() !== '[object Object]') {
              if (val.toString() === productIdStr) return true;
            }
          } catch {}
          const idVal = val && typeof val === 'object' ? (val._id || val.id) : null;
          if (idVal) {
            try { if (idVal.toString() === productIdStr) return true; } catch {}
          }
          return false;
        });
        
        let currentStock = productInRack ? productInRack.stock : 0;
        let newStock;
        
        if (transaction.type === "in") {
          
          newStock = currentStock + parseInt(quantity);
        } else if (transaction.type === "out") {
          
          if (currentStock < parseInt(quantity)) {
            errors.push(`Insufficient stock for product in rack. Available: ${currentStock}, Requested: ${quantity}`);
            continue;
          }
          newStock = currentStock - parseInt(quantity);
        } else {
          errors.push(`Invalid stock type: ${transaction.type}. Must be "in" or "out"`);
          continue;
        }
        
        
        const racksCol = db.collection(racksCollectionName);
        if (productInRack) {
          // Positional update attempts:
          let upd = await racksCol.updateOne(
            { _id: new ObjectId(rackId), "products.product": new ObjectId(productId) },
            { $set: { "products.$.stock": newStock, updatedAt: new Date() } }
          );
          if (!upd || upd.modifiedCount === 0) {
            upd = await racksCol.updateOne(
              { _id: new ObjectId(rackId), "products.product": productIdStr },
              { $set: { "products.$.stock": newStock, updatedAt: new Date() } }
            );
          }
          if (!upd || upd.modifiedCount === 0) {
            // ArrayFilters for embedded object with _id
            upd = await racksCol.updateOne(
              { _id: new ObjectId(rackId) },
              { $set: { "products.$[elem].stock": newStock, updatedAt: new Date() } },
              { arrayFilters: [ { "elem.product._id": new ObjectId(productId) } ] }
            );
          }
          if (!upd || upd.modifiedCount === 0) {
            await racksCol.updateOne(
              { _id: new ObjectId(rackId) },
              { $set: { "products.$[elem].stock": newStock, updatedAt: new Date() } },
              { arrayFilters: [ { "elem.product._id": productIdStr } ] }
            );
          }
        } else {
          
          if (transaction.type === "in") {
            await racksCol.updateOne(
              { _id: new ObjectId(rackId) },
              {
                $push: {
                  products: {
                    product: new ObjectId(productId),
                    stock: parseInt(quantity)
                  }
                },
                $set: { updatedAt: new Date() }
              }
            );
          }
        }
        
        
        item.previousStock = currentStock;
        item.newStock = newStock;
        
      } catch (itemError) {
        console.error(`Error processing item:`, itemError);
        errors.push(`Error processing item: ${itemError.message}`);
      }
    }
    
    
    await db.collection("stocktransactions").updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: "completed",
          updatedAt: new Date()
        } 
      }
    );
    
    
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const itemsDescription = items.length === 1 
      ? `${items[0].quantity} units of ${items[0].productName}`
      : `${items.length} items (${totalQuantity} units total)`;

    const notificationData = {
      type: 'transfer_approved',
      title: 'Transfer Request Approved',
      message: `Transfer request approved: ${itemsDescription}`,
      priority: 'medium',
      category: 'stock_management',
      rawData: {
        transferId: id,
        transactionType: transaction.type,
        items: items.map(item => ({
          productId: item.productId.toString(),
          productName: item.productName,
          projectId: item.projectId.toString(),
          projectName: item.projectName,
          quantity: item.quantity,
          previousStock: item.previousStock,
          newStock: item.newStock
        })),
        status: "completed"
      },
      timestamp: new Date()
    };

    
    const notificationResult = await db.collection("notifications").insertOne(notificationData);
    
    
    broadcastNotification({
      notification: {
        id: notificationResult.insertedId.toString(),
        ...notificationData
      }
    });
    
    
    const activityData = {
      type: 'stock_management',
      action: 'transfer_approved',
      entityType: 'transaction',
      entityId: transaction._id,
      entityName: `Transfer ${transaction._id}`,
      userId: null,
      userEmail: null,
      userName: 'System User',
      changes: {
        status: 'completed',
        previousStatus: transaction.status,
        itemCount: items.length,
        totalQuantity: totalQuantity
      },
      metadata: {
        errors: errors
      },
      timestamp: new Date(),
      createdAt: new Date()
    };

    await db.collection("activities").insertOne(activityData);
    
    return NextResponse.json({
      success: true,
      message: "Transfer approved successfully",
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error("Error approving transfer:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
