import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { broadcastNotification } from "@/lib/notification-broadcaster";
import StockTransactionModel from "@/lib/models/StockTransactions";
import StockTransactionService from "@/lib/services/StockTransactionService";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const {
      type, 
      invoiceNumber,
      supplierName,
      date,
      items, 
      createdBy,
      isOrderMode = false 
    } = body;

    
    if (!type || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Type and items are required" },
        { status: 400 }
      );
    }

    
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.projectId || !item.rackId) {
        return NextResponse.json(
          { error: "Each item must have productId, quantity, projectId, and rackId" },
          { status: 400 }
        );
      }

      if (!ObjectId.isValid(item.productId) || !ObjectId.isValid(item.projectId) || !ObjectId.isValid(item.rackId)) {
        return NextResponse.json(
          { error: "Invalid productId, projectId, or rackId" },
          { status: 400 }
        );
      }
    }

    const stockTransactions = [];
    const errors = [];
    const processedItems = []; 

    
    for (const item of items) {
      try {
        const { productId, quantity, projectId, rackId } = item;

        
        const product = await db.collection("products").findOne({
          _id: new ObjectId(productId)
        });

        if (!product) {
          errors.push(`Product with ID ${productId} not found`);
          continue;
        }

        
        const project = await db.collection("Projects").findOne({
          _id: new ObjectId(projectId)
        });

        if (!project) {
          errors.push(`Project with ID ${projectId} not found`);
          continue;
        }

        
        // Resolve rack from either "racks" or legacy "Racks" collection
        let rack = await db.collection("racks").findOne({
          _id: new ObjectId(rackId)
        });
        let racksCollectionName = "racks";
        if (!rack) {
          const legacyRack = await db.collection("Racks").findOne({
            _id: new ObjectId(rackId)
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

        
        const isRackInProject = project.racks && project.racks.some(
          rackRef => rackRef.toString() === rackId
        );

        if (!isRackInProject) {
          errors.push(`Rack ${rack.rackNumber || rackId} does not belong to project ${project.projectName}`);
          continue;
        }

        
        const productInRack = (rack.products || []).find(
          p => p.product.toString() === productId
        );

        let currentStock = productInRack ? productInRack.stock : 0;
        let newStock;

        if (type === "in") {
          
          newStock = currentStock + parseInt(quantity);
        } else if (type === "out") {
          
          if (currentStock < parseInt(quantity)) {
            errors.push(`Insufficient stock for product ${product.productName} in rack ${rack.rackNumber}. Available: ${currentStock}, Requested: ${quantity}`);
            continue;
          }
          newStock = currentStock - parseInt(quantity);
        } else {
          errors.push(`Invalid stock type: ${type}. Must be "in" or "out"`);
          continue;
        }

        
        if (!isOrderMode) {
          const racksCol = db.collection(racksCollectionName);
          if (productInRack) {
            // Try update with ObjectId
            let upd = await racksCol.updateOne(
              {
                _id: new ObjectId(rackId),
                "products.product": new ObjectId(productId)
              },
              {
                $set: {
                  "products.$.stock": newStock,
                  updatedAt: new Date()
                }
              }
            );
            // Fallback to string stored id
            if (!upd || upd.modifiedCount === 0) {
              await racksCol.updateOne(
                {
                  _id: new ObjectId(rackId),
                  "products.product": productId
                },
                {
                  $set: {
                    "products.$.stock": newStock,
                    updatedAt: new Date()
                  }
                }
              );
            }
          } else {
            if (type === "in") {
              await racksCol.updateOne(
                { _id: new ObjectId(rackId) },
                {
                  $push: {
                    products: {
                      product: new ObjectId(productId),
                      stock: parseInt(quantity, 10)
                    }
                  },
                  $set: { updatedAt: new Date() }
                }
              );
            }
          }
        }

        
        processedItems.push({
          productId: new ObjectId(productId),
          projectId: new ObjectId(projectId),
          rackId: new ObjectId(rackId),
          quantity: parseInt(quantity),
          previousStock: currentStock,
          newStock: newStock,
          productName: product.productName,
          projectName: project.projectName,
          rackNumber: rack.rackNumber
        });

      } catch (itemError) {
        console.error(`Error processing item ${item.productId}:`, itemError);
        errors.push(`Error processing product ${item.productId}: ${itemError.message}`);
      }
    }

    
    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: `Failed to process ${errors.length} items`,
          details: errors 
        },
        { status: 400 }
      );
    }

    
    if (processedItems.length > 0) {
      const transaction = {
        type,
        invoiceNumber: invoiceNumber || null,
        supplierName: supplierName || null,
        date: date ? new Date(date) : new Date(),
        items: processedItems, 
        createdBy: createdBy || null,
        status: isOrderMode ? "pending" : "completed",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      
      if (processedItems.length === 1) {
        const item = processedItems[0];
        transaction.productId = item.productId;
        transaction.projectId = item.projectId;
        transaction.rackId = item.rackId;
        transaction.quantity = item.quantity;
        transaction.previousStock = item.previousStock;
        transaction.newStock = item.newStock;
      }

      stockTransactions.push(transaction);
    }

    
    if (stockTransactions.length > 0) {
      
      const savedTransactions = await StockTransactionService.createTransactions(stockTransactions);
      const savedTransaction = savedTransactions[0]; 

      
      const totalQuantity = processedItems.reduce((sum, item) => sum + item.quantity, 0);
      const itemsDescription = processedItems.length === 1 
        ? `${processedItems[0].quantity} units of ${processedItems[0].productName}`
        : `${processedItems.length} items (${totalQuantity} units total)`;

      const notificationData = {
        type: isOrderMode ? 'order_request' : (type === 'in' ? 'stock_in' : 'stock_out'),
        title: isOrderMode ? 'New Order Request' : `Stock ${type.toUpperCase()} Transaction`,
        message: isOrderMode 
          ? `New order request: ${itemsDescription}`
          : `Stock ${type.toUpperCase()}: ${itemsDescription}`,
        priority: isOrderMode ? 'high' : 'medium',
        category: isOrderMode ? 'order_management' : 'stock_management',
        rawData: {
          _id: savedTransaction._id.toString(),
          transactionType: type,
          items: processedItems.map(item => ({
            productId: item.productId.toString(),
            productName: item.productName,
            projectId: item.projectId.toString(),
            projectName: item.projectName,
            rackId: item.rackId.toString(),
            rackNumber: item.rackNumber,
            quantity: item.quantity,
            previousStock: item.previousStock,
            newStock: item.newStock
          })),
          invoiceNumber: invoiceNumber,
          supplierName: supplierName,
          createdBy: createdBy,
          isOrderMode: isOrderMode,
          status: transaction.status,
          totalQuantity: totalQuantity,
          itemCount: processedItems.length
        },
        timestamp: new Date()
      };

      await db.collection("notifications").insertOne(notificationData);

      
      const activityData = {
        type: 'stock_management',
        action: type === 'in' ? 'stock_in' : 'stock_out',
        entityType: 'order',
        entityId: savedTransaction._id,
        entityName: `Order ${savedTransaction._id}`,
        userId: createdBy ? new ObjectId(createdBy) : null,
        userEmail: null,
        userName: 'System User',
        changes: {
          type: type,
          itemCount: processedItems.length,
          totalQuantity: totalQuantity,
          items: processedItems.map(item => ({
            productName: item.productName,
            quantity: item.quantity,
            previousStock: item.previousStock,
            newStock: item.newStock
          }))
        },
        metadata: {
          invoiceNumber: invoiceNumber,
          supplierName: supplierName,
          isOrderMode: isOrderMode
        },
        timestamp: new Date(),
        createdAt: new Date()
      };

      await db.collection("activities").insertOne(activityData);

      return NextResponse.json({
        success: true,
        message: `Successfully processed ${processedItems.length} items`,
        transaction: savedTransaction,
        itemCount: processedItems.length,
        totalQuantity: totalQuantity
      });
    } else {
      return NextResponse.json(
        { error: "No transactions to save" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Error in stock management:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
