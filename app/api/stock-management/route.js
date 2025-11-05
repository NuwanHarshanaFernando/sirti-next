import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { broadcastNotification } from "@/lib/notification-broadcaster";
import StockTransactionService from "@/lib/services/StockTransactionService";
import { generateTransactionId } from "@/lib/utils/transactionIdGenerator";
import { sendMail } from "@/lib/mailer";
import { generateStockManagementPDFBuffer } from "@/lib/pdf-generator";

export const runtime = "nodejs";

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
      isOrderMode = false,
      message,
      selectedProjectId,
    } = body;

    const createdById = createdBy && ObjectId.isValid(createdBy)
      ? new ObjectId(createdBy)
      : null;
    let createdByObjectId = createdById;
    if (!createdByObjectId && createdBy && typeof createdBy === "string") {
      const userDoc = await db.collection("users").findOne(
        { email: createdBy },
        { projection: { _id: 1 } }
      );
      if (userDoc) createdByObjectId = userDoc._id;
    }
    
    if (!type || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Type and items are required" },
        { status: 400 }
      );
    }

    
    for (const item of items) {
      if (
        !item.productId ||
        !item.quantity ||
        !item.projectId ||
        !item.rackId
      ) {
        return NextResponse.json(
          {
            error:
              "Each item must have productId, quantity, projectId, and rackId",
          },
          { status: 400 }
        );
      }

      if (
        !ObjectId.isValid(item.productId) ||
        !ObjectId.isValid(item.projectId) ||
        !ObjectId.isValid(item.rackId)
      ) {
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
          _id: new ObjectId(productId),
        });

        if (!product) {
          errors.push(`Product with ID ${productId} not found`);
          continue;
        }

        
        const project = await db.collection("Projects").findOne({
          _id: new ObjectId(projectId),
        });

        if (!project) {
          errors.push(`Project with ID ${projectId} not found`);
          continue;
        }

        
        // Resolve rack from either "racks" or legacy "Racks" collection
        let rack = await db.collection("racks").findOne({
          _id: new ObjectId(rackId),
        });
        let racksCollectionName = "racks";
        if (!rack) {
          const legacyRack = await db.collection("Racks").findOne({
            _id: new ObjectId(rackId),
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

        
        const isRackInProject =
          project.racks &&
          project.racks.some((rackRef) => rackRef.toString() === rackId);

        if (!isRackInProject) {
          errors.push(
            `Rack ${rack.rackNumber || rackId} does not belong to project ${
              project.projectName
            }`
          );
          continue;
        }

        
        // Robust match: p.product may be ObjectId, string, or embedded object with _id
        const pidStr = productId.toString();
        const productInRack = (rack.products || []).find((p) => {
          const val = p?.product;
          if (!val) return false;
          if (typeof val === "string") return val === pidStr;
          try {
            // Mongo ObjectId
            if (val && typeof val === "object" && typeof val.toString === "function" && val.toString().length >= 12 && val.toString() !== "[object Object]") {
              if (val.toString() === pidStr) return true;
            }
          } catch {}
          // Embedded object with _id
          const idVal = val && typeof val === "object" ? (val._id || val.id) : null;
          if (idVal) {
            try { if (idVal.toString() === pidStr) return true; } catch {}
          }
          return false;
        });

        let currentStock = productInRack ? productInRack.stock : 0;
        let newStock;

        if (type === "in") {
          
          newStock = currentStock + parseInt(quantity);
        } else if (type === "out") {
          
          if (currentStock < parseInt(quantity)) {
            errors.push(
              `Insufficient stock for product ${product.productName} in rack ${rack.rackNumber}. Available: ${currentStock}, Requested: ${quantity}`
            );
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
            // Try positional update for ObjectId-typed product
            let upd = await racksCol.updateOne(
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
            if (!upd || upd.modifiedCount === 0) {
              // Fallback: positional match when stored as string
              upd = await racksCol.updateOne(
                {
                  _id: new ObjectId(rackId),
                  "products.product": pidStr,
                },
                {
                  $set: {
                    "products.$.stock": newStock,
                    updatedAt: new Date(),
                  },
                }
              );
            }
            if (!upd || upd.modifiedCount === 0) {
              // Fallback: arrayFilters when stored as embedded object with _id (ObjectId)
              upd = await racksCol.updateOne(
                { _id: new ObjectId(rackId) },
                {
                  $set: { "products.$[elem].stock": newStock, updatedAt: new Date() },
                },
                {
                  arrayFilters: [ { "elem.product._id": new ObjectId(productId) } ],
                }
              );
            }
            if (!upd || upd.modifiedCount === 0) {
              // Fallback: arrayFilters with string _id
              await racksCol.updateOne(
                { _id: new ObjectId(rackId) },
                {
                  $set: { "products.$[elem].stock": newStock, updatedAt: new Date() },
                },
                {
                  arrayFilters: [ { "elem.product._id": pidStr } ],
                }
              );
            }
          } else {
            // No existing entry — only add on stock IN
            if (type === "in") {
              await racksCol.updateOne(
                { _id: new ObjectId(rackId) },
                {
                  $push: {
                    products: {
                      product: new ObjectId(productId),
                      stock: parseInt(quantity, 10),
                    },
                  },
                  $set: { updatedAt: new Date() },
                }
              );
            }
          }
        }
        const productCode =
          product.productId || product.code || product.sku || product.productCode || product.barcode || "N/A";
        const unit =
          product.unit ||
          product.measuringUnit ||
          product.unitOfMeasure ||
          product.unitType ||
          product.uom ||
          "EA";

        processedItems.push({
          productId: new ObjectId(productId),
          projectId: new ObjectId(projectId),
          rackId: new ObjectId(rackId),
          quantity: parseInt(quantity),
          previousStock: currentStock,
          newStock: newStock,
          productName: product.productName,
          productCode,
          unit,
          projectName: project.projectName,
          rackNumber: rack.rackNumber,
        });
      } catch (itemError) {
        console.error(`Error processing item ${item.productId}:`, itemError);
        errors.push(
          `Error processing product ${item.productId}: ${itemError.message}`
        );
      }
    }

    
    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: `Failed to process ${errors.length} items`,
          details: errors,
        },
        { status: 400 }
      );
    }

    
    if (processedItems.length > 0) {
      
      const transactionId = await generateTransactionId(type, isOrderMode);

      const transaction = {
        type,
        transactionId,
        invoiceNumber: invoiceNumber || null,
        supplierName: supplierName || null,
        date: date ? new Date(date) : new Date(),
        message: message || null,
        items: processedItems, 
        createdBy: createdByObjectId || null,
        status: isOrderMode ? "pending" : "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
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
      
      const savedTransactions =
        await StockTransactionService.createTransactions(stockTransactions);
      const savedTransaction = savedTransactions && savedTransactions.length > 0
        ? savedTransactions[0]
        : null;

      if (!savedTransaction) {
        return NextResponse.json(
          { error: "Failed to save transaction" },
          { status: 500 }
        );
      }

      
      const totalQuantity = processedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      const itemsDescription =
        processedItems.length === 1
          ? `${processedItems[0].quantity} units of ${processedItems[0].productName}`
          : `${processedItems.length} items (${totalQuantity} units total)`;

      const notificationData = {
        type: isOrderMode
          ? "order_request"
          : type === "in"
          ? "stock_in"
          : "stock_out",
        title: isOrderMode
          ? "New Order Request"
          : `Stock ${type.toUpperCase()} Transaction`,
        message: isOrderMode
          ? `New order request: ${itemsDescription}`
          : `Stock ${type.toUpperCase()}: ${itemsDescription}`,
        priority: isOrderMode ? "high" : "medium",
        category: isOrderMode ? "order_management" : "stock_management",
        rawData: {
          _id: savedTransaction._id.toString(),
          transactionType: type,
          items: processedItems.map((item) => ({
            productId: item.productId.toString(),
            productName: item.productName,
            projectId: item.projectId.toString(),
            projectName: item.projectName,
            rackId: item.rackId.toString(),
            rackNumber: item.rackNumber,
            quantity: item.quantity,
            previousStock: item.previousStock,
            newStock: item.newStock,
          })),
          invoiceNumber: invoiceNumber,
          supplierName: supplierName,
          createdBy: createdBy,
          isOrderMode: isOrderMode,
          status: stockTransactions[0].status,
          totalQuantity: totalQuantity,
          itemCount: processedItems.length,
        },
        timestamp: new Date(),
      };

      
      const notificationResult = await db
        .collection("notifications")
        .insertOne(notificationData);

      
      if (isOrderMode) {
        
        broadcastNotification({
          targetRole: "keeper",
          notification: {
            id: notificationResult.insertedId.toString(),
            ...notificationData,
          },
        });
      } else {
        
        broadcastNotification({
          targetRole: "admin",
          notification: {
            id: notificationResult.insertedId.toString(),
            ...notificationData,
          },
        });

        broadcastNotification({
          targetRole: "keeper",
          notification: {
            id: notificationResult.insertedId.toString(),
            ...notificationData,
          },
        });

        broadcastNotification({
          targetRole: "manager",
          notification: {
            id: notificationResult.insertedId.toString(),
            ...notificationData,
          },
        });
      }

      
      const activityData = {
        type: "stock_management",
        action: type === "in" ? "stock_in" : "stock_out",
        entityType: "order",
        entityId: savedTransaction._id,
        entityName: `Order ${savedTransaction._id}`,
        userId: createdByObjectId,
        userEmail: null,
        userName: "System User",
        changes: {
          type: type,
          itemCount: processedItems.length,
          totalQuantity: totalQuantity,
          items: processedItems.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            previousStock: item.previousStock,
            newStock: item.newStock,
          })),
        },
        metadata: {
          invoiceNumber: invoiceNumber,
          supplierName: supplierName,
          isOrderMode: isOrderMode,
        },
        timestamp: new Date(),
        createdAt: new Date(),
      };

      
      if (createdByObjectId) {
        const user = await db.collection("users").findOne({
          _id: createdByObjectId,
        });
        if (user) {
          activityData.userEmail = user.email;
          activityData.userName =
            user.name || (user.firstName + " " + user.lastName) || user.email;
        }
      }

      // Per-product activity logs (creates one entry per item)
      try {
        const perItemActivities = processedItems.map((item) => ({
          type: "stock_management",
          action: type === "in" ? "stock_in" : (isOrderMode && type === "out" ? "order_request" : "stock_out"),
          entityType: "product",
          entityId: item.productId, // assumed ObjectId upstream
          entityName: item.productName || "Unknown Product",
          userId: createdByObjectId || null,
          userEmail: activityData.userEmail || null,
          userName: activityData.userName || "System User",
          changes: {
            type,
            quantity: item.quantity,
            previousStock: item.previousStock,
            newStock: item.newStock,
            unit: item.unit || item.unitType || "EA",
            rackId: item.rackId || null,
            rackNumber: item.rackNumber || null,
            projectId: item.projectId || null,
            projectName: item.projectName || null,
          },
          projectId: item.projectId || null,
          projectName: item.projectName || null,
          metadata: {
            transactionDbId: savedTransaction._id,
            transactionId: savedTransaction.transactionId,
            invoiceNumber,
            supplierName,
            isOrderMode,
            status: stockTransactions[0].status,
          },
          timestamp: new Date(),
          createdAt: new Date(),
        }));
        if (perItemActivities.length > 0) {
          await db.collection("activities").insertMany(perItemActivities);
        }
      } catch (perItemErr) {
        console.error("Per-item activity logging failed:", perItemErr);
      }

      // Keep an aggregate activity for the transaction as well
      await db.collection("activities").insertOne(activityData);

      // Email notifications on transaction creation
      try {
        // For Order creation (order-create?type=out => isOrderMode=true),
        // send emails to: All Admins, All Staff, and users assigned to the selected project.
        if (isOrderMode && type === "out") {
          const orConds = [{ role: "admin" }, { role: "staff" }, { role: "keeper" }];
          let selectedProjectName = null;
          let targetProjectIds = [];
          if (selectedProjectId && ObjectId.isValid(selectedProjectId)) {
            const pId = new ObjectId(selectedProjectId);
            targetProjectIds = [pId];
          } else {
            // Fallback to projects referenced by items
            const ids = Array.from(
              new Set(
                (processedItems || [])
                  .map((it) => it.projectId?.toString())
                  .filter(Boolean)
              )
            );
            targetProjectIds = ids.map((id) => new ObjectId(id));
          }

          if (targetProjectIds.length > 0) {
            // Direct assignment (single project field)
            orConds.push({ assignedProject: { $in: targetProjectIds } });
            // String-stored fallback
            orConds.push({ assignedProject: { $in: targetProjectIds.map((id) => id.toString()) } });
            // Legacy multi-assignment array (typo in historical data: availaleProjects)
            orConds.push({ availaleProjects: { $in: targetProjectIds } });
            orConds.push({ availaleProjects: { $in: targetProjectIds.map((id) => id.toString()) } });

            // Fetch involved project docs to collect additional user references
            const projectsCursor = db
              .collection("Projects")
              .find(
                { _id: { $in: targetProjectIds } },
                { projection: { projectName: 1, assignedManagers: 1, users: 1, warehouseManager: 1 } }
              );
            const projDocs = await projectsCursor.toArray();
            if (projDocs.length === 1) {
              selectedProjectName = projDocs[0]?.projectName || null;
            }
            const idSet = new Set();
            for (const p of projDocs) {
              (p?.assignedManagers || []).forEach((id) => id && idSet.add(id.toString()));
              (p?.users || []).forEach((id) => id && idSet.add(id.toString()));
              if (p?.warehouseManager) idSet.add(p.warehouseManager.toString());
            }
            const projectUserIds = Array.from(idSet).map((id) => new ObjectId(id));
            if (projectUserIds.length > 0) {
              orConds.push({ _id: { $in: projectUserIds } });
            }
          }

          const recipientsCursor = db
            .collection("users")
            .find({ $or: orConds }, { projection: { email: 1 } });
          const recipientsDocs = await recipientsCursor.toArray();
          const recipientEmails = Array.from(
            new Set(
              (recipientsDocs || [])
                .map((u) => u.email)
                .filter((e) => typeof e === "string" && e.includes("@"))
            )
          );

          if (recipientEmails.length > 0) {
            const subject = `Create Order - ${savedTransaction.transactionId}`;

            // Rows table
            const rowsHtml = processedItems
              .map((item, idx) => {
                const unit = item.unit || item.unitType || "EA";
                const code = item.productCode || item.sku || "N/A";
                return `
                  <tr>
                    <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${idx + 1}</td>
                    <td style="padding:6px;border:1px solid #e5e7eb;">${item.productName || "Unknown Product"}</td>
                    <td style="padding:6px;border:1px solid #e5e7eb;">${code}</td>
                    <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${unit}</td>
                    <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;">${item.quantity || 0}</td>
                  </tr>`;
              })
              .join("");

            const orderNoLabel = savedTransaction.transactionId || "N/A";
            const projectLabel = selectedProjectName || savedTransaction.invoiceNumber || "N/A";
            const personLabel = supplierName || activityData.userName || "N/A";
            const dateLabel = new Date(savedTransaction.date || new Date()).toLocaleDateString();
            const messageText = (message || "").trim();
            const base = process.env.APP_BASE_URL || "";
            const normalizedBase = base.replace(/\/+$/, "");
            const orderViewPath = `/orders/view/${savedTransaction._id?.toString?.() || savedTransaction._id}`;
            const orderViewUrl = `${normalizedBase}${orderViewPath}`;

            const html = `
              <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111827">
                <h2 style="margin:0 0 8px 0;">ORDER</h2>
                <table style="font-size:14px;margin-bottom:12px">
                  <tr>
                    <td style="padding-right:12px"><strong>ORDER NO:</strong></td>
                    <td>${orderNoLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding-right:12px"><strong>Project:</strong></td>
                    <td>${projectLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding-right:12px"><strong>Person:</strong></td>
                    <td>${personLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding-right:12px"><strong>Date:</strong></td>
                    <td>${dateLabel}</td>
                  </tr>
                </table>
                <table style="border-collapse:collapse;width:100%;font-size:14px">
                  <thead>
                    <tr style="background:#f3f4f6">
                      <th style="padding:6px;border:1px solid #e5e7eb;text-align:center">#</th>
                      <th style="padding:6px;border:1px solid #e5e7eb;text-align:left">Goods</th>
                      <th style="padding:6px;border:1px solid #e5e7eb;text-align:left">SKU / Code</th>
                      <th style="padding:6px;border:1px solid #e5e7eb;text-align:center">Unit</th>
                      <th style="padding:6px;border:1px solid #e5e7eb;text-align:right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
                ${messageText ? `<p style="margin-top:12px;font-size:13px"><strong>Additional Message:</strong> ${messageText}</p>` : ""}
                <p style="margin-top:12px;font-size:13px"><strong>Open Order:</strong> <a href="${orderViewUrl}">${orderViewUrl}</a></p>
              </div>
            `;

            // Attempt to attach PDF mirror
            let attachments = [];
            try {
              const { pdfBuffer, filename } = await generateStockManagementPDFBuffer({
                type,
                transactionId: savedTransaction.transactionId,
                invoiceNumber: savedTransaction.invoiceNumber,
                supplierName: savedTransaction.supplierName,
                date: savedTransaction.date,
                items: processedItems.map((p) => ({
                  productName: p.productName,
                  sku: p.productCode || p.sku || "N//A",
                  unit: p.unit || "EA",
                  quantity: p.quantity,
                })),
                createdBy: activityData.userName || "System",
                message: messageText,
                projectName: projectLabel,
              });
              attachments.push({
                filename: filename || `${savedTransaction.transactionId}.pdf`,
                content: Buffer.from(pdfBuffer),
                contentType: "application/pdf",
              });
            } catch (e) {
            }

            // Email-once guard for ORDER: ensure we only send once per transaction
            let orderShouldSend = false;
            try {
              const guardRes = await db.collection('stocktransactions').updateOne(
                { _id: savedTransaction._id, 'emailEvents.orderCreated': { $exists: false } },
                { $set: { 'emailEvents.orderCreated': new Date() } }
              );
              orderShouldSend = guardRes.modifiedCount === 1;
            } catch {}
            if (!orderShouldSend) {
              try { console.log('[email-skip] ORDER already sent for', savedTransaction.transactionId); } catch {}
            }
            if (orderShouldSend) {
              try { console.log('[email] ORDER: sending to', recipientEmails.length, 'recipients for', savedTransaction.transactionId); } catch {}
              await sendMail({
              to: recipientEmails,
              subject,
              html,
              text: `Order ${savedTransaction.transactionId} for ${projectLabel} on ${dateLabel}\nOpen Order: ${orderViewUrl}`,
              attachments,
              });
            }
          }
        } else if (type === "out") {
          const orConds = [{ role: "admin" }];
          let selectedProjectName = null;
          let selectedProjectObjId = null;
          let projectUserIds = [];
          if (selectedProjectId && ObjectId.isValid(selectedProjectId)) {
            selectedProjectObjId = new ObjectId(selectedProjectId);
            orConds.push({ assignedProject: selectedProjectObjId });
            orConds.push({ assignedProject: selectedProjectId });
            orConds.push({ availaleProjects: selectedProjectObjId });
            orConds.push({ availaleProjects: selectedProjectId });

            const selectedProjectDoc = await db.collection("Projects").findOne(
              { _id: selectedProjectObjId },
              { projection: { projectName: 1, assignedManagers: 1, users: 1, warehouseManager: 1 } }
            );
            selectedProjectName = selectedProjectDoc?.projectName || null;

            const idSet = new Set();
            if (Array.isArray(selectedProjectDoc?.assignedManagers)) {
              selectedProjectDoc.assignedManagers.forEach((id) => id && idSet.add(id.toString()));
            }
            if (Array.isArray(selectedProjectDoc?.users)) {
              selectedProjectDoc.users.forEach((id) => id && idSet.add(id.toString()));
            }
            if (selectedProjectDoc?.warehouseManager) {
              idSet.add(selectedProjectDoc.warehouseManager.toString());
            }
            projectUserIds = Array.from(idSet).map((id) => new ObjectId(id));
            if (projectUserIds.length > 0) {
              orConds.push({ _id: { $in: projectUserIds } });
            }
          }

          const recipientsCursor = db.collection("users").find(
            { $or: orConds },
            { projection: { email: 1 } }
          );
          const recipientsDocs = await recipientsCursor.toArray();
          try {
            console.log("Email recipients resolved:", {
              adminOr: true,
              selectedProjectId,
              selectedProjectObjId: selectedProjectObjId?.toString?.(),
              projectUserIdsCount: projectUserIds.length,
              recipientsCount: (recipientsDocs || []).length,
            });
          } catch {}
          const recipientEmails = Array.from(
            new Set(
              (recipientsDocs || [])
                .map((u) => u.email)
                .filter((e) => typeof e === "string" && e.includes("@"))
            )
          );

          if (recipientEmails.length > 0) {
            const subject = `Create Delivery Notice - ${savedTransaction.transactionId}`;
            const rowsHtml = processedItems
              .map((item, idx) => {
                const unit = item.unit || item.unitType || "EA";
                const code = item.productCode || item.sku || "N/A";
                return `
                  <tr>
                    <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${idx +
                      1}</td>
                    <td style="padding:6px;border:1px solid #e5e7eb;">${
                      item.productName || "Unknown Product"
                    }</td>
                    <td style="padding:6px;border:1px solid #e5e7eb;">${code}</td>
                    <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${unit}</td>
                    <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;">${
                      item.quantity || 0
                    }</td>
                  </tr>`;
              })
              .join("");
            const projectLabel = selectedProjectName || "N/A";

            const headerLabel = "DELIVERY NOTE";
            const dnNoLabel = savedTransaction.transactionId || "N/A";
            const personLabel = supplierName || activityData.userName || "N/A";
            const dateLabel = new Date(savedTransaction.date || new Date()).toLocaleDateString();
            const messageText = (message || "").trim();

            const html = `
              <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111827">
                <h2 style="margin:0 0 8px 0;">${headerLabel}</h2>
                <table style="font-size:14px;margin-bottom:12px">
                  <tr>
                    <td style="padding-right:12px"><strong>DN NO:</strong></td>
                    <td>${dnNoLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding-right:12px"><strong>Project:</strong></td>
                    <td>${projectLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding-right:12px"><strong>${type ===
                      "in"
                        ? "Supplier"
                        : "Person"}:</strong></td>
                    <td>${personLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding-right:12px"><strong>Date:</strong></td>
                    <td>${dateLabel}</td>
                  </tr>
                </table>
                <table style="border-collapse:collapse;width:100%;font-size:14px">
                  <thead>
                    <tr style="background:#f3f4f6">
                      <th style="padding:6px;border:1px solid #e5e7eb;text-align:center">#</th>
                      <th style="padding:6px;border:1px solid #e5e7eb;text-align:left">Goods</th>
                      <th style="padding:6px;border:1px solid #e5e7eb;text-align:left">SKU / Code</th>
                      <th style="padding:6px;border:1px solid #e5e7eb;text-align:center">Unit</th>
                      <th style="padding:6px;border:1px solid #e5e7eb;text-align:right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
                ${messageText ? `<p style="margin-top:12px;font-size:13px"><strong>Additional Message:</strong> ${messageText}</p>` : ""}
              </div>
            `;

            let attachments = [];
            try {
              const { pdfBuffer, filename } = await generateStockManagementPDFBuffer({
                type,
                transactionId: savedTransaction.transactionId,
                invoiceNumber: savedTransaction.invoiceNumber,
                supplierName: savedTransaction.supplierName,
                date: savedTransaction.date,
                items: processedItems.map((p) => ({
                  productName: p.productName,
                  sku: p.productCode || p.sku || "N//A",
                  unit: p.unit || "EA",
                  quantity: p.quantity,
                })),
                createdBy: activityData.userName || "System",
                message: messageText,
                projectName: projectLabel,
              });
              attachments.push({
                filename: filename || `${savedTransaction.transactionId}.pdf`,
                content: Buffer.from(pdfBuffer),
                contentType: "application/pdf",
              });
            } catch (e) {
            }

            // Email-once guard for DELIVERY NOTE
            let deliveryShouldSend = false;
            try {
              const guardRes = await db.collection('stocktransactions').updateOne(
                { _id: savedTransaction._id, 'emailEvents.deliveryCreated': { $exists: false } },
                { $set: { 'emailEvents.deliveryCreated': new Date() } }
              );
              deliveryShouldSend = guardRes.modifiedCount === 1;
            } catch {}
            if (!deliveryShouldSend) {
              try { console.log('[email-skip] DELIVERY already sent for', savedTransaction.transactionId); } catch {}
            }
            if (deliveryShouldSend) {
              try { console.log('[email] DELIVERY: sending to', recipientEmails.length, 'recipients for', savedTransaction.transactionId); } catch {}
              await sendMail({
              to: recipientEmails,
              subject,
              html,
              text: `Delivery Notice ${savedTransaction.transactionId} for ${projectLabel} on ${dateLabel}`,
              attachments,
              });
            }
          }
        }
  if (type === "in") {
          const orConds = [{ role: "admin" }];
          let selectedProjectName = null;
          let selectedProjectObjId = null;
          let projectUserIds = [];
          let targetProjectIds = [];
          if (selectedProjectId && ObjectId.isValid(selectedProjectId)) {
            selectedProjectObjId = new ObjectId(selectedProjectId);
            targetProjectIds = [selectedProjectObjId];
          } else {
            const ids = Array.from(
              new Set((processedItems || []).map((it) => it.projectId?.toString()).filter(Boolean))
            );
            targetProjectIds = ids.map((id) => new ObjectId(id));
          }

          if (targetProjectIds.length > 0) {
            orConds.push({ assignedProject: { $in: targetProjectIds } });
            orConds.push({ assignedProject: { $in: targetProjectIds.map((id) => id.toString()) } });
            orConds.push({ availaleProjects: { $in: targetProjectIds } });
            orConds.push({ availaleProjects: { $in: targetProjectIds.map((id) => id.toString()) } });

            const projectsCursor = db.collection("Projects").find(
              { _id: { $in: targetProjectIds } },
              { projection: { projectName: 1, assignedManagers: 1, users: 1, warehouseManager: 1 } }
            );
            const projects = await projectsCursor.toArray();
            if (projects.length === 1) {
              selectedProjectName = projects[0]?.projectName || null;
            }
            const idSet = new Set();
            for (const p of projects) {
              (p?.assignedManagers || []).forEach((id) => id && idSet.add(id.toString()));
              (p?.users || []).forEach((id) => id && idSet.add(id.toString()));
              if (p?.warehouseManager) idSet.add(p.warehouseManager.toString());
            }
            projectUserIds = Array.from(idSet).map((id) => new ObjectId(id));
            if (projectUserIds.length > 0) {
              orConds.push({ _id: { $in: projectUserIds } });
            }
          }

          const recipientsCursorIn = db
            .collection("users")
            .find({ $or: orConds }, { projection: { email: 1 } });
          const recipientsDocs = await recipientsCursorIn.toArray();
          try {
            console.log("GRN email recipients resolved:", {
              adminOr: true,
              selectedProjectId,
              selectedProjectObjId: selectedProjectObjId?.toString?.(),
              projectUserIdsCount: projectUserIds.length,
              recipientsCount: (recipientsDocs || []).length,
            });
          } catch {}
          const recipientEmails = Array.from(
            new Set(
              (recipientsDocs || [])
                .map((u) => u.email)
                .filter((e) => typeof e === "string" && e.includes("@"))
            )
          );

          if (recipientEmails.length > 0) {
            const subject = `Create GRN Order - ${savedTransaction.transactionId}`;

            const rowsHtml = processedItems
              .map((item, idx) => {
                const unit = item.unit || "EA";
                const code = item.productCode || item.sku || "N/A";
                return `
                  <tr>
                    <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${idx + 1}</td>
                    <td style="padding:6px;border:1px solid #e5e7eb;">${item.productName || "Unknown Product"}</td>
                    <td style="padding:6px;border:1px solid #e5e7eb;">${code}</td>
                    <td style="padding:6px;border:1px solid #e5e7eb;text-align:center;">${unit}</td>
                    <td style="padding:6px;border:1px solid #e5e7eb;text-align:right;">${item.quantity || 0}</td>
                  </tr>`;
              })
              .join("");

            const headerLabel = "GOODS RECEIVED NOTE";
            const poNoLabel = savedTransaction.invoiceNumber || "N/A";
            const supplierLabel = savedTransaction.supplierName || activityData.userName || "N/A";
            const grnNoLabel = savedTransaction.transactionId || "N/A";
            const dateLabel = new Date(savedTransaction.date || new Date()).toLocaleDateString();
            const messageText = (message || "").trim();

            const html = `
              <div style="font-family:Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111827">
                <h2 style="margin:0 0 8px 0;">${headerLabel}</h2>
                <table style="font-size:14px;margin-bottom:12px">
                  <tr>
                    <td style="padding-right:12px"><strong>PO NO:</strong></td>
                    <td>${poNoLabel}</td>
                  </tr>
                  ${selectedProjectName ? `
                  <tr>
                    <td style=\"padding-right:12px\"><strong>Project:</strong></td>
                    <td>${selectedProjectName}</td>
                  </tr>` : ``}
                  <tr>
                    <td style="padding-right:12px"><strong>Supplier:</strong></td>
                    <td>${supplierLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding-right:12px"><strong>GRN NO:</strong></td>
                    <td>${grnNoLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding-right:12px"><strong>Date:</strong></td>
                    <td>${dateLabel}</td>
                  </tr>
                </table>
                <table style="border-collapse:collapse;width:100%;font-size:14px">
                  <thead>
                    <tr style="background:#f3f4f6">
                      <th style="padding:6px;border:1px solid #e5e7eb;text-align:center">#</th>
                      <th style="padding:6px;border:1px solid #e5e7eb;text-align:left">Goods</th>
                      <th style="padding:6px;border:1px solid #e5e7eb;text-align:left">SKU / Code</th>
                      <th style="padding:6px;border:1px solid #e5e7eb;text-align:center">Unit</th>
                      <th style="padding:6px;border:1px solid #e5e7eb;text-align:right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
                ${messageText ? `<p style="margin-top:12px;font-size:13px"><strong>Additional Message:</strong> ${messageText}</p>` : ""}
              </div>
            `;

            let attachments = [];
            try {
              const { pdfBuffer, filename } = await generateStockManagementPDFBuffer({
                type,
                transactionId: savedTransaction.transactionId,
                invoiceNumber: savedTransaction.invoiceNumber,
                supplierName: savedTransaction.supplierName,
                date: savedTransaction.date,
                items: processedItems.map((p) => ({
                  productName: p.productName,
                  sku: p.productCode || p.sku || "N//A",
                  unit: p.unit || "EA",
                  quantity: p.quantity,
                })),
                createdBy: activityData.userName || "System",
                message: messageText,
              });
              attachments.push({
                filename: filename || `${savedTransaction.transactionId}.pdf`,
                content: Buffer.from(pdfBuffer),
                contentType: "application/pdf",
              });
            } catch (e) {
            }

            try {
              console.log("Sending GRN email:", {
                toCount: recipientEmails.length,
                subject,
              });
            } catch {}

            // Email-once guard for GRN
            let grnShouldSend = false;
            try {
              const guardRes = await db.collection('stocktransactions').updateOne(
                { _id: savedTransaction._id, 'emailEvents.grnCreated': { $exists: false } },
                { $set: { 'emailEvents.grnCreated': new Date() } }
              );
              grnShouldSend = guardRes.modifiedCount === 1;
            } catch {}
            if (!grnShouldSend) {
              try { console.log('[email-skip] GRN already sent for', savedTransaction.transactionId); } catch {}
            }
            if (grnShouldSend) {
              try { console.log('[email] GRN: sending to', recipientEmails.length, 'recipients for', savedTransaction.transactionId); } catch {}
              await sendMail({
              to: recipientEmails,
              subject,
              html,
              text: `GRN ${savedTransaction.transactionId} (PO: ${poNoLabel}) for ${supplierLabel} on ${dateLabel}`,
              attachments,
              });
            }
          }
        }
      } catch (mailErr) {
        console.error("Email sending error (stock-management):", mailErr);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully processed ${processedItems.length} items`,
        transaction: savedTransaction,
        itemCount: processedItems.length,
        totalQuantity: totalQuantity,
      });
    } else {
      return NextResponse.json(
        { error: "No transactions to save" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Stock management API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const { db } = await connectToDatabase();

    const limit = parseInt(searchParams.get("limit")) || 50;
    const skip = parseInt(searchParams.get("skip")) || 0;
    const type = searchParams.get("type"); 
    const productId = searchParams.get("productId");
    const projectId = searchParams.get("projectId");
    const rackId = searchParams.get("rackId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status"); 

    
    let query = {};

    
    if (type) {
      query.$or = [{ type: type }, { transactionType: type }];
    }

    
    if (status) {
      query.status = status;
    }

    if (productId) query.productId = new ObjectId(productId);
    if (projectId) query.projectId = new ObjectId(projectId);
    if (rackId) query.rackId = new ObjectId(rackId);

    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    
    const transactions = await db
      .collection("stocktransactions")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await db
      .collection("stocktransactions")
      .countDocuments(query);

    return NextResponse.json({
      transactions,
      total,
      limit,
      skip,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error("Error fetching stock transactions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
