import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateStockManagementPDF } from "@/lib/pdf-generator";
import StockTransactionModel from "@/lib/models/StockTransactions";

export async function POST(req) {
  try {
    
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "keeper") {
      return NextResponse.json(
        { error: "Unauthorized. Only keepers can complete orders." },
        { status: 403 }
      );
    }

    const { transactionId } = await req.json();

    if (!transactionId || !ObjectId.isValid(transactionId)) {
      return NextResponse.json(
        { error: "Valid transaction ID is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    const transaction = await db.collection("stocktransactions").findOne({
      _id: new ObjectId(transactionId),
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    if (transaction.status !== "pending") {
      return NextResponse.json(
        { error: "Transaction is not pending" },
        { status: 400 }
      );
    }

    // Detect multi-item transactions
    const hasItems = Array.isArray(transaction.items) && transaction.items.length > 0;

    if (hasItems) {
      // Multi-item transactions: adjust rack stock per item and then complete
      const pdfItems = [];
      const errors = [];

      for (const item of transaction.items) {
        try {
          const productId = item.productId || item.product || item.productDetails?._id;
          const projectId = item.projectId || item.project || item.projectDetails?._id;
          const rackId = item.rackId || item.rack || item.rackDetails?._id;
          const qty = parseInt(item.quantity) || 0;

          if (!productId || !rackId || !qty) {
            errors.push("Missing productId/rackId/quantity in item");
            continue;
          }

          // Resolve rack from either modern 'racks' or legacy 'Racks' collection
          let rack = await db.collection("racks").findOne({ _id: new ObjectId(rackId) });
          let racksCollectionName = "racks";
          if (!rack) {
            const legacyRack = await db.collection("Racks").findOne({ _id: new ObjectId(rackId) });
            if (legacyRack) {
              rack = legacyRack;
              racksCollectionName = "Racks";
            }
          }

          if (!rack) {
            errors.push(`Rack with ID ${rackId} not found`);
          }

          // Find product in rack with robust matching
          const productIdStr = productId.toString();
          const productInRack = (rack?.products || []).find((p) => {
            const val = p?.product;
            if (!val) return false;
            if (typeof val === "string") return val === productIdStr;
            try {
              if (val && typeof val === "object" && typeof val.toString === "function" && val.toString() !== "[object Object]") {
                if (val.toString() === productIdStr) return true;
              }
            } catch {}
            const idVal = val && typeof val === "object" ? (val._id || val.id) : null;
            if (idVal) {
              try {
                if (idVal.toString() === productIdStr) return true;
              } catch {}
            }
            return false;
          });

          let currentStock = productInRack ? (parseInt(productInRack.stock) || 0) : 0;
          let newStock;
          if (transaction.type === "in") {
            newStock = currentStock + qty;
          } else if (transaction.type === "out") {
            if (currentStock < qty) {
              errors.push(`Insufficient stock for product ${productIdStr} in rack. Available: ${currentStock}, Requested: ${qty}`);
              // Skip updating this item but still attempt others
              // Continue to push into PDF list for visibility
              newStock = currentStock;
            } else {
              newStock = currentStock - qty;
            }
          } else {
            errors.push(`Invalid stock type: ${transaction.type}. Must be "in" or "out"`);
            continue;
          }

          // Apply stock update when we have a rack
          if (rack) {
            const racksCol = db.collection(racksCollectionName);
            if (productInRack) {
              // Try several update patterns to match different stored shapes
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
                  { arrayFilters: [{ "elem.product._id": new ObjectId(productId) }] }
                );
              }
              if (!upd || upd.modifiedCount === 0) {
                await racksCol.updateOne(
                  { _id: new ObjectId(rackId) },
                  { $set: { "products.$[elem].stock": newStock, updatedAt: new Date() } },
                  { arrayFilters: [{ "elem.product._id": productIdStr }] }
                );
              }
            } else if (transaction.type === "in") {
              // If stock-in and product missing in rack, push new entry
              await racksCol.updateOne(
                { _id: new ObjectId(rackId) },
                {
                  $push: {
                    products: {
                      product: new ObjectId(productId),
                      stock: qty,
                    },
                  },
                  $set: { updatedAt: new Date() },
                }
              );
            } else {
              // For stock-out but product not present, record error
              errors.push(`Product ${productIdStr} not found in rack ${rackId} for stock-out`);
            }
          }

          // Build PDF item with enriched details
          const [product, project, rackDoc] = await Promise.all([
            db.collection("products").findOne({ _id: new ObjectId(productId) }),
            projectId ? db.collection("Projects").findOne({ _id: new ObjectId(projectId) }) : Promise.resolve(null),
            db.collection(racksCollectionName).findOne({ _id: new ObjectId(rackId) }),
          ]);

          pdfItems.push({
            productId: productIdStr,
            productName: item.productDetails?.productName || item.productName || product?.productName || "Unknown Product",
            productCode: item.productDetails?.code || item.productCode || product?.code || "N/A",
            quantity: qty,
            projectId: projectId ? projectId.toString() : "",
            projectName: item.projectDetails?.projectName || item.projectName || project?.projectName || "Unknown Project",
            rackId: rackId.toString(),
            rackNumber: item.rackDetails?.rackNumber || item.rackNumber || rackDoc?.rackNumber || "Unknown Rack",
          });

        } catch (itemErr) {
          errors.push(`Error processing item: ${itemErr?.message || itemErr}`);
        }
      }

      const totalQuantity = pdfItems.reduce((sum, it) => sum + (parseInt(it.quantity) || 0), 0);

      const pdfData = {
        type: transaction.type,
        transactionId: transactionId,
        invoiceNumber: transaction.invoiceNumber,
        supplierName: transaction.supplierName,
        date: transaction.date,
        items: pdfItems,
        createdBy: session.user.name || session.user.email || "Keeper",
        projectName: pdfItems[0]?.projectName || "N/A",
        message: transaction.message || "",
      };

      await generateStockManagementPDF(pdfData);

      await db
        .collection("stocktransactions")
        .updateOne(
          { _id: new ObjectId(transactionId) },
          { $set: { status: "completed", updatedAt: new Date() } }
        );

      const completionNotification = {
        type: "order_completion",
        title: "Order Completed",
        message: `Order completed: ${pdfItems.length} items (${totalQuantity} units total)` + (errors.length ? `, with ${errors.length} warnings` : ""),
        priority: "high",
        category: "order_management",
        rawData: {
          _id: transactionId,
          transactionType: "ORDER_COMPLETION",
          items: pdfItems,
          completedBy: session.user.name || session.user.email || "Keeper",
          completedAt: new Date(),
          originalTransaction: transaction,
          status: "completed",
          activityType: "order_completion",
          errors,
        },
        timestamp: new Date(),
      };

      await db.collection("notifications").insertOne(completionNotification);

      return NextResponse.json({
        message: errors.length ? "Order completed with warnings" : "Order completed successfully",
        transactionId: transactionId,
        items: pdfItems,
        warnings: errors,
      });
    } else {
      // Single-item transaction flow
      const { type, productId, projectId, rackId, quantity } = transaction;

      if (!productId || !rackId) {
        return NextResponse.json(
          { error: "Transaction data incomplete for completion" },
          { status: 400 }
        );
      }

      const rack = await db.collection("racks").findOne({
        _id: new ObjectId(rackId),
      });

      if (!rack) {
        return NextResponse.json({ error: "Rack not found" }, { status: 404 });
      }

      const productInRack = rack.products.find(
        (p) => p.product.toString() === productId.toString()
      );

      let currentStock = productInRack ? productInRack.stock : 0;
      let newStock;

      if (type === "in") {
        newStock = currentStock + parseInt(quantity);
      } else if (type === "out") {
        if (currentStock < parseInt(quantity)) {
          return NextResponse.json(
            {
              error: `Insufficient stock. Available: ${currentStock}, Requested: ${quantity}`,
            },
            { status: 400 }
          );
        }
        newStock = currentStock - parseInt(quantity);
      } else {
        return NextResponse.json(
          { error: `Invalid stock type: ${type}` },
          { status: 400 }
        );
      }

      if (productInRack) {
        await db.collection("racks").updateOne(
          {
            _id: new ObjectId(rackId),
            "products.product": new ObjectId(productId),
          },
          {
            $set: {
              "products.$.stock": newStock,
              updatedAt: new Date(),
            },
          }
        );
      } else if (type === "in") {
        await db.collection("racks").updateOne(
          { _id: new ObjectId(rackId) },
          {
            $push: {
              products: {
                product: new ObjectId(productId),
                stock: parseInt(quantity),
              },
            },
            $set: { updatedAt: new Date() },
          }
        );
      }

      await db.collection("stocktransactions").updateOne(
        { _id: new ObjectId(transactionId) },
        {
          $set: {
            previousStock: currentStock,
            newStock: newStock,
            status: "completed",
            updatedAt: new Date(),
          },
        }
      );

      const product = await db.collection("products").findOne({
        _id: new ObjectId(productId),
      });
      const project = await db.collection("Projects").findOne({
        _id: new ObjectId(projectId),
      });

      const enrichedItem = {
        productId: productId.toString(),
        productName: product?.productName || "Unknown Product",
        productCode: product?.code || "N/A",
        quantity: parseInt(quantity),
        projectId: projectId.toString(),
        projectName: project?.projectName || "Unknown Project",
        rackId: rackId.toString(),
        rackNumber: rack?.rackNumber || "Unknown Rack",
      };

      const pdfData = {
        type,
        transactionId: transactionId,
        invoiceNumber: transaction.invoiceNumber,
        supplierName: transaction.supplierName,
        date: transaction.date,
        items: [enrichedItem],
        createdBy: session.user.name || session.user.email || "Keeper",
        projectName: project?.projectName || "N/A",
        message: transaction.message || "",
      };

      await generateStockManagementPDF(pdfData);

      const completionNotification = {
        type: "order_completion",
        title: "Order Completed",
        message: `Order completed: ${quantity} units of ${enrichedItem.productName} for ${enrichedItem.projectName}`,
        priority: "high",
        category: "order_management",
        rawData: {
          _id: transactionId,
          transactionType: "ORDER_COMPLETION",
          productId: productId.toString(),
          productName: enrichedItem.productName,
          projectId: projectId.toString(),
          projectName: enrichedItem.projectName,
          rackId: rackId.toString(),
          rackNumber: enrichedItem.rackNumber,
          quantity: parseInt(quantity),
          completedBy: session.user.name || session.user.email || "Keeper",
          completedAt: new Date(),
          originalTransaction: transaction,
          status: "completed",
          activityType: "order_completion",
        },
        timestamp: new Date(),
      };

      await db.collection("notifications").insertOne(completionNotification);

      return NextResponse.json({
        message: "Order completed successfully",
        transactionId: transactionId,
        newStock: newStock,
      });
    }
  } catch (error) {
    console.error("Error completing order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
