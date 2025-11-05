import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { broadcastNotification } from "@/lib/notification-broadcaster";
import { sendMail } from "@/lib/mailer";

function renderAdjustmentRequestEmailHTML({ request, productName }) {
  const fmt = (v) => (v === undefined || v === null || v === "" ? "-" : v);
  const rows = [
    ["Request ID", fmt(request.requestId)],
    ["Product", fmt(productName)],
    ["Project", fmt(request.projectName)],
    ["Rack", fmt(request.rackNumber)],
    ["Stock On Hand", fmt(request.stockOnHand)],
    ["Stock On Hold", fmt(request.stockOnHold)],
    ["Current Rack Stock", fmt(request.currentRackStock)],
    ["Requested Manager", fmt(request.requestedByName || request.requestedBy)],
    ["Requested By (email)", fmt(request.requestedBy)],
    ["Requested At", new Date(request.requestedAt || Date.now()).toLocaleString()],
    ["Reason", fmt(request.reason)],
    ["Status", fmt(request.status)],
  ];
  return `
  <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111">
    <h2 style="margin:0 0 8px 0">Stock Adjustment Request</h2>
    <p style="margin:0 0 12px 0">A new stock adjustment request has been submitted and requires approval.</p>
    <table style="border-collapse: collapse; width: 100%;">
      <tbody>
        ${rows
      .map(
        ([k, v]) => `
          <tr>
            <td style="border:1px solid #ddd; padding:8px; background:#f8f8f8; width:220px"><strong>${k}</strong></td>
            <td style="border:1px solid #ddd; padding:8px;">${v}</td>
          </tr>`
      )
      .join("")}
      </tbody>
    </table>
    <p style="margin-top:12px">You can review and approve this request in the application.</p>
  </div>`;
}

function renderApprovalEmailHTML({ request, productName }) {
  const rows = [
    ["Request ID", request.requestId],
    ["Product", productName],
    ["Project", request.projectName],
    ["Rack", request.rackNumber],
    ["Approved Stock On Hand", request.stockOnHand],
    ["Approved Stock On Hold", request.stockOnHold],
    ["Approved By", request.approvedByName || request.approvedBy || "-"],
    ["Approved At", new Date(request.approvedAt || Date.now()).toLocaleString()],
  ];
  return `
  <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111">
    <h2 style="margin:0 0 8px 0">Stock Adjustment Request Approved</h2>
    <p style="margin:0 0 12px 0">Your stock adjustment request has been approved. Details are below:</p>
    <table style="border-collapse: collapse; width: 100%;">
      <tbody>
        ${rows
      .map(
        ([k, v]) => `
          <tr>
            <td style="border:1px solid #ddd; padding:8px; background:#f8f8f8; width:260px"><strong>${k}</strong></td>
            <td style="border:1px solid #ddd; padding:8px;">${v}</td>
          </tr>`
      )
      .join("")}
      </tbody>
    </table>
    <p style="margin-top:12px">No action is required from you.</p>
  </div>`;
}

async function getAdminEmails(db) {
  const emails = new Set();
  try {
    const lower = await db
      .collection("users")
      .find({ role: "admin", email: { $exists: true, $ne: null } }, { projection: { email: 1 } })
      .toArray();
    lower.forEach(u => u.email && emails.add(u.email));
  } catch (_) { }
  try {
    const upper = await db
      .collection("Users")
      .find({ role: "admin", email: { $exists: true, $ne: null } }, { projection: { email: 1 } })
      .toArray();
    upper.forEach(u => u.email && emails.add(u.email));
  } catch (_) { }
  return Array.from(emails);
}

async function findUserByEmail(db, email) {
  if (!email) return null;
  try {
    const u = await db.collection("users").findOne({ email });
    if (u) return u;
  } catch (_) { }
  try {
    const u = await db.collection("Users").findOne({ email });
    if (u) return u;
  } catch (_) { }
  return null;
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    } = body;
    if (!productId || !projectId || !rackNumber || reason?.trim() === "") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const validatedStockOnHand = Math.max(0, stockOnHand || 0);
    const validatedStockOnHold = Math.max(0, stockOnHold || 0);
    const { db } = await connectToDatabase();
    let currentRackStock = 0;
    if (rackNumber) {
      const rack = await db.collection("racks").findOne({ rackNumber });
      if (rack) {
        const productInRack = rack.products?.find(p =>
          p.product.toString() === productId
        );
        currentRackStock = productInRack ? productInRack.stock : 0;
      }
    }
    const collection = db.collection("stockadjustmentrequests");
    const newRequest = {
      requestId: `SAR-${Date.now()}`,
      productId,
      projectId,
      projectName,
      rackNumber,
      stockOnHand: validatedStockOnHand,
      stockOnHold: validatedStockOnHold,
      currentRackStock,
      isRackLevel: true,
      reason: reason.trim(),
      status: "pending",
      requestedBy: session.user.email,
      requestedByName: session.user.name || session.user.email,
      requestedAt: new Date(),
      type: "stock_adjustment",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(newRequest);
    // Activity: request created
    try {
      const { db } = await connectToDatabase();
      let userIdObj = null;
      try {
        if (session.user.id && ObjectId.isValid(session.user.id)) {
          userIdObj = new ObjectId(session.user.id);
        }
      } catch (_) {}
      if (!userIdObj) {
        try {
          const u = await findUserByEmail(db, session.user.email);
          if (u?._id) userIdObj = u._id;
        } catch (_) {}
      }
      await db.collection("activities").insertOne({
        type: "stock_adjustment",
        action: "request_created",
        entityType: "stock_adjustment_request",
        entityId: result.insertedId,
        entityName: newRequest.requestId,
        userId: userIdObj,
        userEmail: session.user.email,
        userName: session.user.name || session.user.email,
        projectId: new ObjectId(projectId),
        projectName: projectName,
        changes: {
          productId: new ObjectId(productId),
          rackNumber,
          requestedStockOnHand: validatedStockOnHand,
          requestedStockOnHold: validatedStockOnHold,
          currentRackStock,
          reason: reason?.trim() || null,
        },
        metadata: {
          userRole: session.user.role || "-",
        },
        timestamp: new Date(),
        createdAt: new Date(),
      });
    } catch (actErr) {
      console.error("Activity (request_created) failed:", actErr);
    }
    try {
      const product = await db.collection("products").findOne({ _id: new ObjectId(productId) });
      const productName = product?.productName || "Unknown Product";
      const requesterName = session.user.name || session.user.email;
      broadcastNotification({
        type: "targeted",
        targetRole: "admin",
        notification: {
          message: "New Stock Adjustment Request",
          description: `${requesterName} requested stock adjustment for ${productName} in ${projectName || "Unknown Project"} - Rack ${rackNumber}`,
          actionUrl: "/notifications"
        }
      });
      try {
        const adminEmails = await getAdminEmails(db);
        if (adminEmails.length > 0) {
          const storedRequest = await collection.findOne({ _id: result.insertedId });
          const subject = `Request Approval ${storedRequest.requestId}`;
          const html = renderAdjustmentRequestEmailHTML({ request: storedRequest, productName });
          // Email-once guard for SAR admin notification
          let shouldSend = false;
          try {
            const guardRes = await collection.updateOne(
              { _id: storedRequest._id, 'emailEvents.adminRequested': { $exists: false } },
              { $set: { 'emailEvents.adminRequested': new Date() } }
            );
            shouldSend = guardRes.modifiedCount === 1;
          } catch {}
          if (!shouldSend) {
            try { console.log('[email-skip] SAR admin request already sent for', storedRequest.requestId); } catch {}
          }
          if (shouldSend) {
            try { console.log('[email] SAR: sending request to admins', adminEmails.length, 'for', storedRequest.requestId); } catch {}
            await sendMail({ to: adminEmails, subject, html });
          }
        } else {
          console.warn("No admin emails found to notify for stock adjustment request", newRequest.requestId);
        }
      } catch (mailError) {
        console.error("Failed to send admin emails for stock adjustment request:", mailError);
      }
    } catch (broadcastError) {
      console.error("Error broadcasting stock adjustment notification:", broadcastError);
    }
    return NextResponse.json({
      success: true,
      requestId: newRequest.requestId,
      message: "Stock adjustment request submitted successfully",
    });
  } catch (error) {
    console.error("Error creating stock adjustment request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { db } = await connectToDatabase();
    const collection = db.collection("stockadjustmentrequests");
    const { searchParams } = new URL(request.url);
    const userRole = session.user.role;
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");
    let filter = {};
    if (userRole !== "admin" && searchParams.has("filterByUser")) {
      filter.requestedBy = session.user.email;
    }
    if (productId) {
      filter.productId = productId;
    }
    if (status) {
      filter.status = status;
    }
    const requests = await collection
      .find(filter)
      .sort({ requestedAt: -1 })
      .toArray();
    if (requests.length > 0) {
      const requestsWithRacks = requests.filter(req => req.rackNumber && req.isRackLevel);
      if (requestsWithRacks.length > 0) {
        const rackNumbers = [...new Set(requestsWithRacks.map(req => req.rackNumber))];
        const racks = await db.collection("racks")
          .find({ rackNumber: { $in: rackNumbers } })
          .toArray();
        const rackMap = {};
        racks.forEach(rack => {
          rackMap[rack.rackNumber] = rack;
        });
        for (let request of requests) {
          if (request.rackNumber && request.isRackLevel && request.productId) {
            const rack = rackMap[request.rackNumber];
            if (rack) {
              const productInRack = rack.products?.find(p =>
                p.product.toString() === request.productId
              );
              request.currentRackStock = productInRack ? productInRack.stock : 0;
            }
          }
        }
      }
    }
    const pendingCount = await collection.countDocuments({
      ...filter,
      status: "pending",
    });
    return NextResponse.json({
      requests,
      pendingCount,
    });
  } catch (error) {
    console.error("Error fetching stock adjustment requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { db } = await connectToDatabase();
    const collection = db.collection("stockadjustmentrequests");
    const body = await request.json();
    const { requestId, action } = body;
    if (action === "approve" && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can approve stock adjustment requests" },
        { status: 403 }
      );
    }
    const updateData = {
      status: action === "approve" ? "approved" : "rejected",
      updatedAt: new Date(),
    };
    if (action === "approve") {
      updateData.approvedBy = session.user.id || session.user.email;
      updateData.approvedByName = session.user.name || session.user.email;
      updateData.approvedAt = new Date();
    } else {
      updateData.rejectedBy = session.user.id || session.user.email;
      updateData.rejectedByName = session.user.name || session.user.email;
      updateData.rejectedAt = new Date();
      console.log("User rejecting request:", {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        storedAs: updateData.rejectedByName
      });
    }
    const result = await collection.findOneAndUpdate(
      { requestId: requestId },
      { $set: updateData },
      { returnDocument: "after" }
    );
    const updatedRequestDoc = result && (result.value || result);
    if (!updatedRequestDoc) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (action === "approve") {
      const approvedRequest = updatedRequestDoc;
      try {
        const racksCollection = db.collection("racks");
        console.log(" Updating rack stock...");

        // Read previous rack stock for this product in the rack (for activity logging)
        let prevRackStock = 0;
        try {
          const prevRack = await racksCollection.findOne({ rackNumber: approvedRequest.rackNumber });
          const prevProd = prevRack?.products?.find(p => p.product?.toString?.() === approvedRequest.productId);
          prevRackStock = Number(prevProd?.stock || 0);
        } catch (_) {}

        const rackUpdateResult = await racksCollection.findOneAndUpdate(
          {
            rackNumber: approvedRequest.rackNumber,
            "products.product": new ObjectId(approvedRequest.productId),
          },
          {
            $set: {
              "products.$.stock": approvedRequest.stockOnHand,
              updatedAt: new Date(),
            },
          },
          { returnDocument: "after" }
        );
        const updatedRackDoc = rackUpdateResult && (rackUpdateResult.value || rackUpdateResult);
        if (updatedRackDoc) {
          console.log(" Rack stock updated successfully");
          const updatedProduct = updatedRackDoc.products?.find(p =>
            p.product.toString() === approvedRequest.productId
          );
          console.log(" Verified rack stock:", updatedProduct?.stock);
        } else {
          console.log(" Rack update failed - product not found in rack, adding it...");
          const rackExists = await racksCollection.findOne({
            rackNumber: approvedRequest.rackNumber
          });
          if (!rackExists) {
            console.log(" Rack not found:", approvedRequest.rackNumber);
            throw new Error(`Rack ${approvedRequest.rackNumber} not found`);
          }
          const addProductResult = await racksCollection.updateOne(
            { rackNumber: approvedRequest.rackNumber },
            {
              $addToSet: {
                products: {
                  product: new ObjectId(approvedRequest.productId),
                  stock: approvedRequest.stockOnHand,
                },
              },
              $set: { updatedAt: new Date() },
            }
          );
          if (addProductResult.modifiedCount > 0) {
            console.log(" Product added to rack successfully");
            // If product was added new, previous stock was 0
            prevRackStock = 0;
          } else {
            console.log(" Failed to add product to rack");
            throw new Error("Failed to add product to rack");
          }
        }
        const stockOnHoldCollection = db.collection("stockOnHold");
        const rackStockOnHoldCollection = db.collection("rackStockOnHold");
        const projectObjectId = new ObjectId(approvedRequest.projectId);
        const productObjectId = new ObjectId(approvedRequest.productId);
        // Read previous held quantity (project-level) for activity logging
        let prevHeldQuantity = 0;
        try {
          const prevHold = await stockOnHoldCollection.findOne({
            projectId: projectObjectId,
            productId: productObjectId,
          });
          prevHeldQuantity = Number(prevHold?.heldQuantity || 0);
        } catch (_) {}
        // Update rack-level hold for the specific rack in the request
        const rackKey = {
          rackNumber: approvedRequest.rackNumber,
          projectId: projectObjectId,
          productId: productObjectId,
        };
        const approvedHoldQty = Number(approvedRequest.stockOnHold || 0);
        if (approvedHoldQty > 0) {
          await rackStockOnHoldCollection.replaceOne(
            rackKey,
            {
              ...rackKey,
              heldQuantity: approvedHoldQty,
              updatedAt: new Date(),
              updatedBy: session.user.email || session.user.name || "system",
            },
            { upsert: true }
          );
        } else {
          await rackStockOnHoldCollection.deleteOne(rackKey);
        }

        // Aggregate all rack holds to compute project-level hold, then update stockOnHold
        const allRackHolds = await rackStockOnHoldCollection
          .find({ projectId: projectObjectId, productId: productObjectId })
          .toArray();
        const totalHeldQty = allRackHolds.reduce((sum, h) => sum + Number(h?.heldQuantity || 0), 0);
        if (totalHeldQty > 0) {
          await stockOnHoldCollection.replaceOne(
            { projectId: projectObjectId, productId: productObjectId },
            {
              projectId: projectObjectId,
              productId: productObjectId,
              heldQuantity: totalHeldQty,
              updatedAt: new Date(),
              updatedBy: session.user.email || session.user.name || "system",
            },
            { upsert: true }
          );
          console.log(" Stock on hold aggregated to:", totalHeldQty);
        } else {
          await stockOnHoldCollection.deleteOne({ projectId: projectObjectId, productId: productObjectId });
          console.log(" Stock on hold cleared (0)");
        }

        // Activity: request approved + manual adjustment applied (detailed)
        try {
          let approverIdObj = null;
          try {
            if (session.user.id && ObjectId.isValid(session.user.id)) {
              approverIdObj = new ObjectId(session.user.id);
            }
          } catch (_) {}
          if (!approverIdObj) {
            try {
              const u = await findUserByEmail(db, session.user.email);
              if (u?._id) approverIdObj = u._id;
            } catch (_) {}
          }
          const productDoc = await db.collection("products").findOne({ _id: productObjectId }, { projection: { productName: 1 } });
          const productName = productDoc?.productName || "Unknown Product";

          // 1) Approval record
          await db.collection("activities").insertOne({
            type: "stock_adjustment",
            action: "request_approved",
            entityType: "stock_adjustment_request",
            entityId: updatedRequestDoc._id,
            entityName: updatedRequestDoc.requestId,
            userId: approverIdObj,
            userEmail: session.user.email,
            userName: session.user.name || session.user.email,
            projectId: projectObjectId,
            projectName: approvedRequest.projectName,
            changes: {
              productId: productObjectId,
              productName,
              rackNumber: approvedRequest.rackNumber,
              approvedStockOnHand: approvedRequest.stockOnHand,
              approvedStockOnHold: approvedRequest.stockOnHold,
              reason: approvedRequest.reason || null,
            },
            metadata: { userRole: session.user.role || "-" },
            timestamp: new Date(),
            createdAt: new Date(),
          });

          // 2) Detailed manual adjustment record (product-level)
          await db.collection("activities").insertOne({
            type: "stock_adjustment",
            action: "manual_adjustment_applied",
            entityType: "product",
            entityId: productObjectId,
            entityName: productName,
            userId: approverIdObj,
            userEmail: session.user.email,
            userName: session.user.name || session.user.email,
            projectId: projectObjectId,
            projectName: approvedRequest.projectName,
            changes: {
              rackNumber: approvedRequest.rackNumber,
              stockOnHand: { previous: prevRackStock, new: Number(approvedRequest.stockOnHand), delta: Number(approvedRequest.stockOnHand) - Number(prevRackStock) },
              stockOnHold: { previous: prevHeldQuantity, new: Number(totalHeldQty), delta: Number(totalHeldQty) - Number(prevHeldQuantity) },
              requestId: updatedRequestDoc.requestId,
              reason: approvedRequest.reason || null,
            },
            metadata: { userRole: session.user.role || "-" },
            timestamp: new Date(),
            createdAt: new Date(),
          });
        } catch (actErr) {
          console.error("Activity (approval/manual_adjustment) failed:", actErr);
        }
      } catch (inventoryError) {
        console.error("💥 Error updating inventory:", inventoryError);
        await collection.updateOne(
          { requestId: approvedRequest.requestId },
          {
            $set: {
              status: "failed",
              failureReason: inventoryError.message,
              failedAt: new Date()
            }
          }
        );
        return NextResponse.json({
          error: "Request approved but inventory update failed: " + inventoryError.message,
          requestStatus: "failed"
        }, { status: 500 });
      }
    }
    // Activity: request rejected (if applicable)
    if (action !== "approve") {
      try {
        let actorIdObj = null;
        try {
          if (session.user.id && ObjectId.isValid(session.user.id)) {
            actorIdObj = new ObjectId(session.user.id);
          }
        } catch (_) {}
        if (!actorIdObj) {
          try {
            const u = await findUserByEmail(db, session.user.email);
            if (u?._id) actorIdObj = u._id;
          } catch (_) {}
        }
        await db.collection("activities").insertOne({
          type: "stock_adjustment",
          action: "request_rejected",
          entityType: "stock_adjustment_request",
          entityId: updatedRequestDoc._id,
          entityName: updatedRequestDoc.requestId,
          userId: actorIdObj,
          userEmail: session.user.email,
          userName: session.user.name || session.user.email,
          projectId: new ObjectId(updatedRequestDoc.projectId),
          projectName: updatedRequestDoc.projectName,
          changes: {
            productId: new ObjectId(updatedRequestDoc.productId),
            rackNumber: updatedRequestDoc.rackNumber,
            reason: updatedRequestDoc.reason || null,
          },
          metadata: { userRole: session.user.role || "-" },
          timestamp: new Date(),
          createdAt: new Date(),
        });
      } catch (actErr) {
        console.error("Activity (request_rejected) failed:", actErr);
      }
    }
    try {
      const product = await db.collection("products").findOne({ _id: new ObjectId(updatedRequestDoc.productId) });
      const productName = product?.productName || "Unknown Product";
      const statusMessage = action === "approve" ? "approved" : "rejected";
      const requesterEmail = updatedRequestDoc.requestedBy;
      const requester = await findUserByEmail(db, requesterEmail);
      if (requester) {
        broadcastNotification({
          type: "targeted",
          targetUsers: [requester._id.toString()],
          notification: {
            message: `Stock Adjustment Request ${statusMessage.charAt(0).toUpperCase() + statusMessage.slice(1)}`,
            description: `Your stock adjustment request for ${productName} in ${updatedRequestDoc.projectName || "Unknown Project"} - Rack ${updatedRequestDoc.rackNumber} has been ${statusMessage}`,
            actionUrl: "/notifications"
          }
        });
        if (action === "approve" && requester.email) {
          try {
            const subject = `Request Approval ${updatedRequestDoc.requestId} - Approved`;
            const html = renderApprovalEmailHTML({ request: updatedRequestDoc, productName });
            // Email-once guard for requester approval
            let shouldSend = false;
            try {
              const guardRes = await collection.updateOne(
                { _id: updatedRequestDoc._id, 'emailEvents.requesterApproved': { $exists: false } },
                { $set: { 'emailEvents.requesterApproved': new Date() } }
              );
              shouldSend = guardRes.modifiedCount === 1;
            } catch {}
            if (!shouldSend) {
              try { console.log('[email-skip] SAR approval already sent to requester for', updatedRequestDoc.requestId); } catch {}
            }
            if (shouldSend) {
              try { console.log('[email] SAR: sending approval to requester', requester.email, 'for', updatedRequestDoc.requestId); } catch {}
              await sendMail({ to: requester.email, subject, html });
            }
          } catch (mailError) {
            console.error("Failed to send approval email to requester:", mailError);
          }
        }
      }
    } catch (broadcastError) {
      console.error("Error broadcasting stock adjustment approval notification:", broadcastError);
    }
    return NextResponse.json({
      success: true,
      message: `Request ${action === "approve" ? "approved" : "rejected"
        } successfully`,
      request: updatedRequestDoc,
    });
  } catch (error) {
    console.error("Error processing stock adjustment request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}