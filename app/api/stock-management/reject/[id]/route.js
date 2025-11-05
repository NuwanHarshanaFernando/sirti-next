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
        { error: "Only pending transactions can be rejected" },
        { status: 400 }
      );
    }
    
    
    await db.collection("stocktransactions").updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: "rejected",
          updatedAt: new Date()
        } 
      }
    );
    
    
    const items = transaction.items || [];
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const itemsDescription = items.length === 1 
      ? `${items[0].quantity} units of ${items[0].productName}`
      : `${items.length} items (${totalQuantity} units total)`;

    const notificationData = {
      type: 'transfer_rejected',
      title: 'Transfer Request Rejected',
      message: `Transfer request rejected: ${itemsDescription}`,
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
          quantity: item.quantity
        })),
        status: "rejected"
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
      action: 'transfer_rejected',
      entityType: 'transaction',
      entityId: transaction._id,
      entityName: `Transfer ${transaction._id}`,
      userId: null,
      userEmail: null,
      userName: 'System User',
      changes: {
        status: 'rejected',
        previousStatus: transaction.status,
        itemCount: items.length,
        totalQuantity: totalQuantity
      },
      timestamp: new Date(),
      createdAt: new Date()
    };

    await db.collection("activities").insertOne(activityData);
    
    return NextResponse.json({
      success: true,
      message: "Transfer rejected successfully"
    });
    
  } catch (error) {
    console.error("Error rejecting transfer:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
