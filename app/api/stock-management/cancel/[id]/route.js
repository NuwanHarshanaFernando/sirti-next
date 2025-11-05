import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

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
      _id: new ObjectId(id),
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // If this is an order request (no stock movement yet), allow cancel when pending
    if (transaction.isOrderMode) {
      if (transaction.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending order requests can be cancelled" },
          { status: 400 }
        );
      }

      await db.collection("stocktransactions").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "cancelled",
            updatedAt: new Date(),
          },
        }
      );

      // Optional: notify and activity log
      const items = transaction.items || [];
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const itemsDescription =
        items.length === 1
          ? `${items[0].quantity} units of ${items[0].productName}`
          : `${items.length} items (${totalQuantity} units total)`;

      const notificationData = {
        type: "order_request_cancelled",
        title: "Order Request Cancelled",
        message: `Order request cancelled: ${itemsDescription}`,
        priority: "low",
        category: "stock_management",
        rawData: {
          transferId: id,
          transactionType: transaction.type,
          items: items.map((item) => ({
            productId: item.productId?.toString?.() || String(item.productId),
            productName: item.productName,
            projectId: item.projectId?.toString?.() || String(item.projectId),
            projectName: item.projectName,
            quantity: item.quantity,
          })),
          status: "cancelled",
        },
        timestamp: new Date(),
      };

      await db.collection("notifications").insertOne(notificationData);

      await db.collection("activities").insertOne({
        type: "stock_management",
        action: "order_cancelled",
        entityType: "transaction",
        entityId: transaction._id,
        entityName: `Order ${transaction._id}`,
        userId: null,
        userEmail: null,
        userName: "System User",
        changes: {
          status: "cancelled",
          previousStatus: transaction.status,
          itemCount: items.length,
          totalQuantity,
        },
        timestamp: new Date(),
        createdAt: new Date(),
      });

      return NextResponse.json({ success: true, message: "Order request cancelled" });
    }

    // For GRN/DN (stock in/out) that already updated racks, we must reverse stock and mark as cancelled
    if (transaction.status !== "completed") {
      return NextResponse.json(
        { error: "Only completed stock transactions can be cancelled" },
        { status: 400 }
      );
    }

    // Normalize items for legacy single-item transactions
    const items = (transaction.items && transaction.items.length > 0)
      ? transaction.items
      : [{
          productId: transaction.productId,
          projectId: transaction.projectId,
          rackId: transaction.rackId,
          quantity: transaction.quantity,
          productName: transaction.productName,
          projectName: transaction.projectName,
          rackNumber: transaction.rackNumber,
        }];

    const errors = [];

    for (const item of items) {
      try {
        const { productId, rackId, quantity } = item;
        if (!productId || !rackId || !quantity) {
          errors.push("Missing required fields in item");
          continue;
        }

        // Resolve rack from either "racks" or legacy "Racks" collection
        let rack = await db.collection("racks").findOne({
          _id: new ObjectId(rackId.toString()),
        });
        let racksCollectionName = "racks";
        if (!rack) {
          const legacyRack = await db.collection("Racks").findOne({
            _id: new ObjectId(rackId.toString()),
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
        const currentStock = productInRack ? productInRack.stock : 0;

        let newStock;
        if (transaction.type === "in") {
          // Reverse IN => subtract
          newStock = currentStock - parseInt(quantity);
          if (newStock < 0) {
            errors.push(
              `Insufficient stock to cancel: rack ${rack.rackNumber} product ${productIdStr}. Current: ${currentStock}, Need to deduct: ${quantity}`
            );
            continue;
          }
        } else if (transaction.type === "out") {
          // Reverse OUT => add back
          newStock = currentStock + parseInt(quantity);
        } else {
          errors.push(`Invalid transaction type: ${transaction.type}`);
          continue;
        }

        const racksCol = db.collection(racksCollectionName);
        if (productInRack) {
          // Try update with ObjectId first
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
          // No existing product line: if reversing OUT (add), push; if reversing IN (subtract), it's invalid and already caught
          if (transaction.type === "out") {
            await racksCol.updateOne(
              { _id: new ObjectId(rackId) },
              {
                $push: { products: { product: new ObjectId(productId), stock: parseInt(quantity) } },
                $set: { updatedAt: new Date() },
              }
            );
          }
        }
      } catch (e) {
        errors.push(`Error reversing item: ${e.message}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: `Failed to cancel due to ${errors.length} item errors`, details: errors },
        { status: 400 }
      );
    }

    await db.collection("stocktransactions").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "cancelled", updatedAt: new Date() } }
    );

    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const itemsDescription =
      items.length === 1
        ? `${items[0].quantity} units of ${items[0].productName}`
        : `${items.length} items (${totalQuantity} units total)`;

    const notificationData = {
      type: "transaction_cancelled",
      title: "Stock Transaction Cancelled",
      message: `Transaction cancelled and stock reversed: ${itemsDescription}`,
      priority: "medium",
      category: "stock_management",
      rawData: {
        transactionId: id,
        transactionType: transaction.type,
        status: "cancelled",
      },
      timestamp: new Date(),
    };
    await db.collection("notifications").insertOne(notificationData);

    await db.collection("activities").insertOne({
      type: "stock_management",
      action: "transaction_cancelled",
      entityType: "transaction",
      entityId: transaction._id,
      entityName: `Transaction ${transaction._id}`,
      userId: null,
      userEmail: null,
      userName: "System User",
      changes: { status: "cancelled", previousStatus: transaction.status },
      metadata: { transactionType: transaction.type },
      timestamp: new Date(),
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, message: "Transaction cancelled" });
  } catch (error) {
    console.error("Error cancelling transaction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
