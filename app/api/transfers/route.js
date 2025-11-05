import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { broadcastNotification } from "@/lib/notification-broadcaster";
import { sendMail } from "@/lib/mailer";

function projectNameOrExternal(projectDoc, id) {
  if (id === "EXTERNAL") return "External";
  return projectDoc?.projectName || "Unknown Project";
}

async function getUserEmailsByIds(db, ids = []) {
  const uniqueIds = Array.from(
    new Set(
      (ids || [])
        .filter(Boolean)
        .map((x) => (typeof x === "string" ? new ObjectId(x) : x))
    )
  );
  if (uniqueIds.length === 0) return [];
  const users = await db
    .collection("users")
    .find({ _id: { $in: uniqueIds } }, { projection: { email: 1 } })
    .toArray();
  return users.map((u) => u?.email).filter(Boolean);
}

async function getAdminEmails(db) {
  const admins = await db
    .collection("users")
    .find({ role: "admin" }, { projection: { email: 1 } })
    .toArray();
  return admins.map((a) => a?.email).filter(Boolean);
}

async function getProjectManagersEmails(db, projectId) {
  try {
    if (!projectId || projectId === "EXTERNAL") return [];
    const project = await db
      .collection("Projects")
      .findOne({ _id: new ObjectId(projectId) });
    if (!project) return [];
    const managerIds = new Set();
    if (project.warehouseManager) managerIds.add(project.warehouseManager);
    if (Array.isArray(project.assignedManagers))
      project.assignedManagers.forEach((m) => m && managerIds.add(m));
    if (project.isLobby && project.lobbyOwner) managerIds.add(project.lobbyOwner);
    return await getUserEmailsByIds(db, Array.from(managerIds));
  } catch (e) {
    console.warn("getProjectManagersEmails failed:", e?.message || e);
    return [];
  }
}

async function buildTransferEmailContent(db, transferDocOrData, opts = {}) {
  const { stage = "created" } = opts;
  const tid = transferDocOrData.transferId || transferDocOrData._id?.toString();
  const prodId =
    typeof transferDocOrData.productId === "string"
      ? new ObjectId(transferDocOrData.productId)
      : transferDocOrData.productId;
  const product = await db
    .collection("products")
    .findOne({ _id: prodId });
  const productName = product?.productName || "Unknown Product";
  const productCode = product?.productCode || "";
  const unit = product?.unit || "";
  const fromProjId =
    transferDocOrData.fromProjectId === "EXTERNAL"
      ? "EXTERNAL"
      : typeof transferDocOrData.fromProjectId === "string"
        ? new ObjectId(transferDocOrData.fromProjectId)
        : transferDocOrData.fromProjectId;
  const fromProjectDoc =
    fromProjId === "EXTERNAL"
      ? null
      : await db.collection("Projects").findOne({ _id: fromProjId });
  const toProjId =
    transferDocOrData.toProjectId === "EXTERNAL"
      ? "EXTERNAL"
      : typeof transferDocOrData.toProjectId === "string"
        ? new ObjectId(transferDocOrData.toProjectId)
        : transferDocOrData.toProjectId;
  const toProjectDoc =
    toProjId === "EXTERNAL"
      ? null
      : await db.collection("Projects").findOne({ _id: toProjId });
  const fromProjectName = projectNameOrExternal(
    fromProjectDoc,
    transferDocOrData.fromProjectId
  );
  const toProjectName = projectNameOrExternal(
    toProjectDoc,
    transferDocOrData.toProjectId
  );
  let requester = null;
  try {
    const reqId =
      typeof transferDocOrData.requestedBy === "string"
        ? new ObjectId(transferDocOrData.requestedBy)
        : transferDocOrData.requestedBy;
    requester = await db.collection("users").findOne({ _id: reqId });
  } catch { }
  const requesterName = requester?.name || "Unknown User";
  const requesterEmail = requester?.email || "";
  const qtyRequested = Number(transferDocOrData.quantity) || 0;
  const qtyApproved = Number(
    transferDocOrData.approvedQuantity || transferDocOrData.quantity
  );
  const createdAt = transferDocOrData.createdAt
    ? new Date(transferDocOrData.createdAt)
    : new Date();
  const approvedAt = transferDocOrData.approvedAt
    ? new Date(transferDocOrData.approvedAt)
    : null;
  const subject = `Transfers - ${tid}`;
  const lines = [
    `Transfer ID: ${tid}`,
    `DB Id: ${transferDocOrData._id || "(pending)"}`,
    `Status: ${transferDocOrData.status || "pending"}`,
    `Type: ${transferDocOrData.transferType || "OUT"}`,
    `Product: ${productName}${productCode ? ` (${productCode})` : ""}`,
    `Unit: ${unit}`,
    `Quantity Requested: ${qtyRequested}`,
    stage === "approved" ? `Quantity Approved: ${qtyApproved}` : null,
    `From Project: ${fromProjectName}`,
    `From Rack: ${transferDocOrData.fromRack || "-"}`,
    `To Project: ${toProjectName}`,
    `To Rack: ${transferDocOrData.toRack || "-"}`,
    `Reason: ${transferDocOrData.reason || "-"}`,
    `Requested By: ${requesterName}${requesterEmail ? ` <${requesterEmail}>` : ""}`,
    `Requested At: ${createdAt.toLocaleString()}`,
    stage === "approved" && approvedAt
      ? `Approved At: ${approvedAt.toLocaleString()}`
      : null,
  ].filter(Boolean);
  const text = lines.join("\n");
  const html = `
    ${renderTransferEmailHTML({
    stage,
    transfer: {
      transferId: tid,
      dbId: transferDocOrData._id || "(pending)",
      status: transferDocOrData.status || "pending",
      transferType: transferDocOrData.transferType || "OUT",
      productName,
      productCode,
      unit,
      quantityRequested: qtyRequested,
      quantityApproved: stage === "approved" ? qtyApproved : undefined,
      fromProjectName,
      fromRack: transferDocOrData.fromRack || "-",
      toProjectName,
      toRack: transferDocOrData.toRack || "-",
      reason: transferDocOrData.reason || "-",
      requestedByName: requesterName,
      requestedByEmail: requesterEmail || "-",
      requestedAt: createdAt,
      approvedAt,
      approvedByName: transferDocOrData.approvedByName || "-",
    },
  })}
  `;
  return { subject, text, html };
}

function renderTransferEmailHTML({ stage, transfer }) {
  const fmt = (v) => (v === undefined || v === null || v === "" ? "-" : v);
  const baseRows = [
    ["Transfer ID", fmt(transfer.transferId)],
    ["Product", fmt(transfer.productName + (transfer.productCode ? ` (${transfer.productCode})` : ""))],
    ["Unit", fmt(transfer.unit)],
    ["From Project", fmt(transfer.fromProjectName)],
    ["From Rack", fmt(transfer.fromRack)],
    ["To Project", fmt(transfer.toProjectName)],
    ["To Rack", fmt(transfer.toRack)],
    ["Transfer Type", fmt(transfer.transferType)],
    ["Quantity Requested", fmt(transfer.quantityRequested)],
  ];
  const createdExtras = [
    ["Requested Manager", fmt(transfer.requestedByName)],
    ["Requested By (email)", fmt(transfer.requestedByEmail)],
    ["Requested At", new Date(transfer.requestedAt || Date.now()).toLocaleString()],
    ["Reason", fmt(transfer.reason)],
    ["Status", fmt(transfer.status)],
  ];
  const approvedExtras = [
    ["Quantity Approved", fmt(transfer.quantityApproved)],
    ["Approved By", fmt(transfer.approvedByName)],
    ["Approved At", transfer.approvedAt ? new Date(transfer.approvedAt).toLocaleString() : "-"],
  ];
  const rows = stage === "approved" ? baseRows.concat(approvedExtras) : baseRows.concat(createdExtras);
  const title = stage === "approved" ? "Transfer Request Approved" : "Transfer Request";
  const desc = stage === "approved"
    ? "Your transfer request has been approved. Details are below:"
    : "A new transfer request has been submitted and may require your attention.";
  return `
  <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111">
    <h2 style="margin:0 0 8px 0">${title}</h2>
    <p style="margin:0 0 12px 0">${desc}</p>
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
    <p style="margin-top:12px">You can review this in the application.</p>
  </div>`;
}

export async function GET(req) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");
    let query = {};
    if (productId) {
      query.productId = new ObjectId(productId);
    }
    if (status) {
      query.status = status;
    }
    const transfers = await db.collection("transfers").find(query).toArray();
    return NextResponse.json({
      transfers,
      count: transfers.length,
      success: true,
    });
  } catch (error) {
    console.error("Transfers API error:", error);
    return NextResponse.json(
      {
        error: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json(); const {
      productId,
      fromProjectId,
      toProjectId,
      quantity,
      reason,
      requestedBy,
      fromRack,
      toRack,
      transferType,
    } = body;
    if (
      !productId ||
      !fromProjectId ||
      !toProjectId ||
      !quantity ||
      !requestedBy
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    const product = await db.collection("products").findOne({
      _id: new ObjectId(productId),
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    let fromProject = null;
    let toProject = null;
    if (fromProjectId !== "EXTERNAL") {
      fromProject = await db.collection("Projects").findOne({
        _id: new ObjectId(fromProjectId),
      });
      if (!fromProject) {
        return NextResponse.json(
          { error: "Source project not found" },
          { status: 404 }
        );
      }
    }
    if (toProjectId !== "EXTERNAL") {
      toProject = await db.collection("Projects").findOne({
        _id: new ObjectId(toProjectId),
      });
      if (!toProject) {
        return NextResponse.json(
          { error: "Destination project not found" },
          { status: 404 }
        );
      }
    }
    if (product && Array.isArray(product.includedProjects) && product.includedProjects.length > 0) {
      const isFromLobby = fromProject?.isLobby === true;
      const isToLobby = toProject?.isLobby === true;
      const fromAllowed = fromProjectId === "EXTERNAL" || isFromLobby || product.includedProjects.some(pid => pid.toString() === fromProjectId);
      const toAllowed = toProjectId === "EXTERNAL" || isToLobby || product.includedProjects.some(pid => pid.toString() === toProjectId);
      if (!fromAllowed || !toAllowed) {
        return NextResponse.json({ error: "One or both projects are not included for this product (Lobby is always allowed)." }, { status: 403 });
      }
    }
    if (fromProjectId !== "EXTERNAL") {
      const fromProject = await db.collection("Projects").findOne({
        _id: new ObjectId(fromProjectId),
      });
      const racksWithProduct = await db
        .collection("racks")
        .find({
          "products.product": new ObjectId(productId),
        })
        .toArray();
      let availableStockInFromProject = 0;
      for (const rack of racksWithProduct) {
        const rackBelongsToFromProject =
          fromProject.racks &&
          fromProject.racks.some(
            (rackId) => rackId.toString() === rack._id.toString()
          );
        if (rackBelongsToFromProject) {
          const productInRack = rack.products.find(
            (p) => p.product.toString() === productId
          );
          if (productInRack && productInRack.stock > 0) {
            availableStockInFromProject += productInRack.stock;
          }
        }
      }
      if (quantity > availableStockInFromProject) {
        return NextResponse.json(
          {
            error: `Insufficient stock in source project. Available: ${availableStockInFromProject}, Requested: ${quantity}`,
            availableStock: availableStockInFromProject,
            requestedQuantity: quantity,
          },
          { status: 400 }
        );
      }
    }
    const isTransferOut = transferType === "OUT";
    const isTransferIn = transferType === "IN";
    if (isTransferOut && fromProjectId !== "EXTERNAL") {
      const fromProject = await db.collection("Projects").findOne({
        _id: new ObjectId(fromProjectId),
      });
      const racksWithProduct = await db
        .collection("racks")
        .find({
          "products.product": new ObjectId(productId),
        })
        .toArray();
      let availableStockInFromProject = 0;
      for (const rack of racksWithProduct) {
        const rackBelongsToFromProject =
          fromProject.racks &&
          fromProject.racks.some(
            (rackId) => rackId.toString() === rack._id.toString()
          );
        if (rackBelongsToFromProject) {
          const productInRack = rack.products.find(
            (p) => p.product.toString() === productId
          );
          if (productInRack && productInRack.stock > 0) {
            availableStockInFromProject += productInRack.stock;
          }
        }
      }
      if (quantity > availableStockInFromProject) {
        return NextResponse.json(
          {
            error: `Insufficient stock in source project. Available: ${availableStockInFromProject}, Requested: ${quantity}`,
            availableStock: availableStockInFromProject,
            requestedQuantity: quantity,
          },
          { status: 400 }
        );
      }
    }
    const transferRequest = {
      transferId: `TRF-${Date.now()}`,
      productId: new ObjectId(productId),
      fromProjectId:
        fromProjectId === "EXTERNAL" ? "EXTERNAL" : new ObjectId(fromProjectId),
      toProjectId:
        toProjectId === "EXTERNAL" ? "EXTERNAL" : new ObjectId(toProjectId),
      quantity: parseInt(quantity),
      reason: reason || "",
      requestedBy: new ObjectId(requestedBy),
      fromRack: fromRack || null,
      toRack: toRack || null,
      transferType: transferType || "OUT",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    }; const result = await db.collection("transfers").insertOne(transferRequest);
    if (result.insertedId) {
      const createdTransferDoc = { ...transferRequest, _id: result.insertedId };
      try {
        const adminEmails = await getAdminEmails(db);
        const fromManagers = await getProjectManagersEmails(db, fromProjectId);
        const toManagers = await getProjectManagersEmails(db, toProjectId);
        const toList = Array.from(new Set([...
          adminEmails,
          fromManagers,
          toManagers,
        ].flat().filter(Boolean)));
        // Email-once guard: set emailEvents.created if not exists; only send when we set it now
        let shouldSend = false;
        try {
          const guardRes = await db.collection("transfers").updateOne(
            { _id: result.insertedId, "emailEvents.created": { $exists: false } },
            { $set: { "emailEvents.created": new Date() } }
          );
          shouldSend = guardRes.modifiedCount === 1;
        } catch {}
        if (toList.length > 0 && shouldSend) {
          const { subject, text, html } = await buildTransferEmailContent(
            db,
            createdTransferDoc,
            { stage: "created" }
          );
          await sendMail({ to: toList, subject, text, html });
        } else if (!shouldSend) {
          try { console.log("[email-skip] Transfers created email already sent for", createdTransferDoc.transferId); } catch {}
        }
      } catch (mailErr) {
        console.warn("Transfer creation email failed:", mailErr?.message || mailErr);
      }
      if (isTransferOut && fromProjectId !== "EXTERNAL") {
        await db.collection("stockOnHold").updateOne(
          {
            projectId: new ObjectId(fromProjectId),
            productId: new ObjectId(productId)
          },
          {
            $inc: { heldQuantity: parseInt(quantity) },
            $set: { updatedAt: new Date() },
            $setOnInsert: {
              createdAt: new Date(),
              projectId: new ObjectId(fromProjectId),
              productId: new ObjectId(productId)
            }
          },
          { upsert: true }
        );
        if (fromRack) {
          await db.collection("rackStockOnHold").updateOne(
            {
              rackNumber: fromRack,
              projectId: new ObjectId(fromProjectId),
              productId: new ObjectId(productId)
            },
            {
              $inc: { heldQuantity: parseInt(quantity) },
              $set: { updatedAt: new Date() },
              $setOnInsert: {
                createdAt: new Date(),
                rackNumber: fromRack,
                projectId: new ObjectId(fromProjectId),
                productId: new ObjectId(productId)
              }
            },
            { upsert: true }
          );
        }
      } else if (isTransferIn) {
        console.log(` [TRANSFER IN] Transfer IN request created - no stock on hold needed until completion`);
      }
      try {
        const productName = product?.productName || "Unknown Product";
        const fromProjectName = fromProjectId === "EXTERNAL" ? "External" : (await db.collection("Projects").findOne({ _id: new ObjectId(fromProjectId) }))?.projectName || "Unknown Project";
        const toProjectName = toProjectId === "EXTERNAL" ? "External" : (await db.collection("Projects").findOne({ _id: new ObjectId(toProjectId) }))?.projectName || "Unknown Project";
        const requester = await db.collection("users").findOne({ _id: new ObjectId(requestedBy) });
        const requesterName = requester?.name || "Unknown User";
        const transferDirection = isTransferOut ? "OUT" : "IN";
        const transferDescription = isTransferOut
          ? `${requesterName} requested to send ${quantity} ${productName} from ${fromProjectName} to ${toProjectName}`
          : `${requesterName} requested to receive ${quantity} ${productName} from ${fromProjectName} to ${toProjectName}`;
        broadcastNotification({
          type: "targeted",
          targetRole: "admin",
          notification: {
            message: `New Stock Transfer ${transferDirection} Request`,
            description: transferDescription,
            actionUrl: "/notifications"
          }
        });
      } catch (broadcastError) {
        console.error("Error broadcasting notification:", broadcastError);
      }
      return NextResponse.json(
        {
          message: "Transfer request created successfully",
          transferId: result.insertedId,
          success: true,
        },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { error: "Failed to create transfer request" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Transfer creation error:", error);
    return NextResponse.json(
      {
        error: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    const { transferId, status, approvedBy, approvedByName, action, destinationRack, sourceRack, completedBy, completedByName, approvedQuantity } = body;
    if (!transferId) {
      return NextResponse.json(
        { error: "Transfer ID is required" },
        { status: 400 }
      );
    }
    const transfer = await db
      .collection("transfers")
      .findOne({ _id: new ObjectId(transferId) });
    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer request not found" },
        { status: 404 }
      );
    }
    if (action === "complete") {
      if (transfer.status !== "approved") {
        return NextResponse.json(
          { error: "Transfer must be approved before completion" },
          { status: 400 }
        );
      }
      const isTransferOut = transfer.transferType === "OUT" || !transfer.transferType;
      const isTransferIn = transfer.transferType === "IN";
      if (isTransferOut) {
        if (!destinationRack) {
          return NextResponse.json(
            { error: "Destination rack is required for Transfer OUT completion" },
            { status: 400 }
          );
        }
        return await completeTransferOut(db, transfer, destinationRack, completedBy, completedByName);
      } else if (isTransferIn) {
        if (!sourceRack) {
          return NextResponse.json(
            { error: "Source rack is required for Transfer IN completion" },
            { status: 400 }
          );
        }
        return await completeTransferIn(db, transfer, sourceRack, completedBy, completedByName);
      }
    } else {
      if (!status) {
        return NextResponse.json(
          { error: "Status is required for approval" },
          { status: 400 }
        );
      }
      return await approveTransfer(db, transfer, status, approvedBy, approvedByName, approvedQuantity);
    }
  } catch (error) {
    console.error("Transfer update error:", error);
    return NextResponse.json(
      {
        error: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}

async function approveTransfer(db, transfer, status, approvedBy, approvedByName, approvedQuantity) {
  const updateData = {
    status,
    updatedAt: new Date(),
  };
  if (approvedBy) {
    updateData.approvedBy = new ObjectId(approvedBy);
    updateData.approvedByName = approvedByName || "Unknown User";
    updateData.approvedAt = new Date();
    if (status === "approved") {
      const reqQty = Number(transfer.quantity) || 0;
      let finalApprovedQty = Number(approvedQuantity);
      if (!Number.isFinite(finalApprovedQty) || finalApprovedQty <= 0) {
        finalApprovedQty = reqQty;
      }
      finalApprovedQty = Math.min(finalApprovedQty, reqQty);
      updateData.approvedQuantity = finalApprovedQty;
    }
  }
  const result = await db
    .collection("transfers")
    .updateOne({ _id: transfer._id }, { $set: updateData });
  const updated = await db.collection("transfers").findOne({ _id: transfer._id });
  if (result.modifiedCount === 1) {
    const effectiveApprovedQty = updateData.approvedQuantity || transfer.approvedQuantity || transfer.quantity;
    if (transfer.fromProjectId !== "EXTERNAL") {
      if (status === "approved") {
        const isTransferOut = transfer.transferType === "OUT" || !transfer.transferType;
        if (isTransferOut) {
          try {
            const releaseQty = Math.max(0, (Number(transfer.quantity) || 0) - (Number(effectiveApprovedQty) || 0));
            if (releaseQty > 0) {
              const heldDoc = await db.collection("stockOnHold").findOne({
                projectId: new ObjectId(transfer.fromProjectId),
                productId: new ObjectId(transfer.productId)
              });
              const currentHeld = Number(heldDoc?.heldQuantity || 0);
              const safeDec = Math.min(releaseQty, Math.max(0, currentHeld));
              if (safeDec > 0) {
                await db.collection("stockOnHold").updateOne(
                  {
                    projectId: new ObjectId(transfer.fromProjectId),
                    productId: new ObjectId(transfer.productId)
                  },
                  { $inc: { heldQuantity: -safeDec }, $set: { updatedAt: new Date() } }
                );
              }
              if (transfer.fromRack) {
                const rackHeldDoc = await db.collection("rackStockOnHold").findOne({
                  rackNumber: transfer.fromRack,
                  projectId: new ObjectId(transfer.fromProjectId),
                  productId: new ObjectId(transfer.productId)
                });
                const currentRackHeld = Number(rackHeldDoc?.heldQuantity || 0);
                const safeRackDec = Math.min(releaseQty, Math.max(0, currentRackHeld));
                if (safeRackDec > 0) {
                  await db.collection("rackStockOnHold").updateOne(
                    {
                      rackNumber: transfer.fromRack,
                      projectId: new ObjectId(transfer.fromProjectId),
                      productId: new ObjectId(transfer.productId)
                    },
                    { $inc: { heldQuantity: -safeRackDec }, $set: { updatedAt: new Date() } }
                  );
                }
              }
            }
          } catch (e) {
            console.warn("Partial approval hold adjustment warning:", e?.message || e);
          }
        }
      } else if (status === "rejected") {
        await db.collection("stockOnHold").updateOne(
          {
            projectId: new ObjectId(transfer.fromProjectId),
            productId: new ObjectId(transfer.productId)
          },
          {
            $inc: { heldQuantity: -transfer.quantity },
            $set: { updatedAt: new Date() }
          }
        );
        if (transfer.fromRack) {
          await db.collection("rackStockOnHold").updateOne(
            {
              rackNumber: transfer.fromRack,
              projectId: new ObjectId(transfer.fromProjectId),
              productId: new ObjectId(transfer.productId)
            },
            {
              $inc: { heldQuantity: -transfer.quantity },
              $set: { updatedAt: new Date() }
            }
          );
        }
      }
    }
    try {
      const product = await db.collection("products").findOne({ _id: new ObjectId(transfer.productId) });
      const productName = product?.productName || "Unknown Product";
      const fromProjectName = transfer.fromProjectId === "EXTERNAL" ? "External" : (await db.collection("Projects").findOne({ _id: new ObjectId(transfer.fromProjectId) }))?.projectName || "Unknown Project";
      const toProjectName = transfer.toProjectId === "EXTERNAL" ? "External" : (await db.collection("Projects").findOne({ _id: new ObjectId(transfer.toProjectId) }))?.projectName || "Unknown Project";
      const statusMessage = status === "approved" ? "approved" : "rejected";
      const requesterUserId = transfer.requestedBy.toString();
      broadcastNotification({
        type: "targeted",
        targetUsers: [requesterUserId],
        notification: {
          message: `Transfer Request ${statusMessage.charAt(0).toUpperCase() + statusMessage.slice(1)}`,
          description: `Your request for ${effectiveApprovedQty} ${productName} from ${fromProjectName} to ${toProjectName} has been ${statusMessage}`,
          actionUrl: "/notifications"
        }
      });
      try {
        const updatedTransferForEmail = { ...updated };
        const adminEmails = await getAdminEmails(db);
        const fromManagers = await getProjectManagersEmails(db, updated.fromProjectId?.toString());
        const toManagers = await getProjectManagersEmails(db, updated.toProjectId?.toString());
        const requesterDoc = await db.collection("users").findOne({ _id: new ObjectId(updated.requestedBy) });
        const requesterEmail = requesterDoc?.email;
        const recipients = Array.from(new Set([...
          adminEmails,
          fromManagers,
          toManagers,
        ].flat().filter(Boolean)));
        const { subject, text, html } = await buildTransferEmailContent(db, updatedTransferForEmail, { stage: "approved" });
        // Email-once guard: set emailEvents.approved if not exists; only send when we set it now
        let shouldSend = false;
        try {
          const guardRes = await db.collection("transfers").updateOne(
            { _id: updated._id, "emailEvents.approved": { $exists: false } },
            { $set: { "emailEvents.approved": new Date() } }
          );
          shouldSend = guardRes.modifiedCount === 1;
        } catch {}
        // Send a single email to the union of recipients; include requester only if not already included
        const finalRecipients = new Set(recipients);
        if (requesterEmail) finalRecipients.add(requesterEmail);
        const uniqueRecipients = Array.from(finalRecipients);
        if (uniqueRecipients.length > 0 && shouldSend) {
          await sendMail({ to: uniqueRecipients, subject, text, html });
        } else if (!shouldSend) {
          try { console.log("[email-skip] Transfers approval email already sent for", updatedTransferForEmail.transferId || updated._id?.toString?.()); } catch {}
        }
      } catch (mailErr) {
        console.warn("Transfer approval email failed:", mailErr?.message || mailErr);
      }
      if (status === "approved") {
        const isTransferOut = transfer.transferType === "OUT" || !transfer.transferType;
        const isTransferIn = transfer.transferType === "IN";
        if (isTransferOut && transfer.toProjectId !== "EXTERNAL") {
          const destinationProject = await db.collection("Projects").findOne({ _id: new ObjectId(transfer.toProjectId) });
          const sourceProject = transfer.fromProjectId !== "EXTERNAL" ? await db.collection("Projects").findOne({ _id: new ObjectId(transfer.fromProjectId) }) : null;
          const notifyDest = new Set();
          const addUsers = (proj, set) => {
            if (!proj) return;
            if (proj.warehouseManager) set.add(proj.warehouseManager.toString());
            if (Array.isArray(proj.assignedManagers)) proj.assignedManagers.forEach(m => set.add(m.toString()));
            if (Array.isArray(proj.users) && set.size === 0) proj.users.forEach(u => set.add(u.toString()));
            if (proj.isLobby && proj.lobbyOwner) set.add(proj.lobbyOwner.toString());
          };
          addUsers(destinationProject, notifyDest);
          if (notifyDest.size === 0) {
            addUsers(sourceProject, notifyDest);
          }
          if (notifyDest.size > 0) {
            broadcastNotification({
              type: "targeted",
              targetUsers: Array.from(notifyDest),
              notification: {
                message: "Transfer OUT Request Approved - Action Required",
                description: `A transfer OUT of ${effectiveApprovedQty} ${productName} from ${fromProjectName} to ${toProjectName} has been approved and requires completion`,
                actionUrl: "/notifications"
              }
            });
          } else {
            console.warn(` No users found for destination or source project in OUT transfer ${transfer._id}`);
          }
        } else if (isTransferIn && transfer.fromProjectId !== "EXTERNAL") {
          const sourceProject = await db.collection("Projects").findOne({ _id: new ObjectId(transfer.fromProjectId) });
          const destinationProject = transfer.toProjectId !== "EXTERNAL" ? await db.collection("Projects").findOne({ _id: new ObjectId(transfer.toProjectId) }) : null;
          const notifySource = new Set();
          const addUsers = (proj, set) => {
            if (!proj) return;
            if (proj.warehouseManager) set.add(proj.warehouseManager.toString());
            if (Array.isArray(proj.assignedManagers)) proj.assignedManagers.forEach(m => set.add(m.toString()));
            if (Array.isArray(proj.users) && set.size === 0) proj.users.forEach(u => set.add(u.toString()));
            if (proj.isLobby && proj.lobbyOwner) set.add(proj.lobbyOwner.toString());
          };
          addUsers(sourceProject, notifySource);
          if (notifySource.size === 0) {
            addUsers(destinationProject, notifySource);
          }
          if (notifySource.size > 0) {
            broadcastNotification({
              type: "targeted",
              targetUsers: Array.from(notifySource),
              notification: {
                message: "Transfer IN Request Approved - Action Required",
                description: `A transfer IN of ${effectiveApprovedQty} ${productName} from ${fromProjectName} to ${toProjectName} has been approved and requires completion`,
                actionUrl: "/notifications"
              }
            });
          } else {
            console.warn(` No users found for source or destination project in IN transfer ${transfer._id}`);
          }
        }
      }
    } catch (broadcastError) {
      console.error("Error broadcasting approval notification:", broadcastError);
    }
    if (status === "approved") {
      return NextResponse.json({
        message: "Transfer approved successfully. Stock remains on hold until destination manager selects racks and completes transfer.",
        success: true,
      });
    } else if (status === "rejected") {
      return NextResponse.json({
        message: "Transfer rejected successfully. Stock has been returned to original source rack.",
        success: true,
      });
    } else {
      return NextResponse.json({
        message: "Transfer status updated successfully.",
        success: true,
      });
    }
  } else {
    return NextResponse.json(
      { error: "Failed to update transfer status" },
      { status: 500 }
    );
  }
}

async function completeTransferOut(db, transfer, destinationRack, completedBy, completedByName) {
  try {
    const { productId, fromProjectId, toProjectId } = transfer;
    const moveQty = Number(transfer.approvedQuantity || transfer.quantity) || 0;
    const destinationProject = await db.collection("Projects").findOne({
      _id: new ObjectId(toProjectId),
    });
    if (!destinationProject) {
      return NextResponse.json(
        { error: "Destination project not found" },
        { status: 404 }
      );
    }
    const destinationRackDoc = await db.collection("racks").findOne({
      rackNumber: destinationRack,
      _id: { $in: destinationProject.racks || [] }
    });
    if (!destinationRackDoc) {
      return NextResponse.json(
        { error: "Selected rack not found in destination project" },
        { status: 400 }
      );
    }
    await performStockMovement(db, { ...transfer, quantity: moveQty }, destinationRackDoc);
    if (transfer.fromProjectId !== "EXTERNAL") {
      await db.collection("stockOnHold").updateOne(
        {
          projectId: new ObjectId(transfer.fromProjectId),
          productId: new ObjectId(transfer.productId)
        },
        {
          $inc: { heldQuantity: -moveQty },
          $set: { updatedAt: new Date() }
        }
      );
      if (transfer.fromRack) {
        await db.collection("rackStockOnHold").updateOne(
          {
            rackNumber: transfer.fromRack,
            projectId: new ObjectId(transfer.fromProjectId),
            productId: new ObjectId(transfer.productId)
          },
          {
            $inc: { heldQuantity: -moveQty },
            $set: { updatedAt: new Date() }
          }
        );
      }
    }
    const updateResult = await db.collection("transfers").updateOne(
      { _id: transfer._id },
      {
        $set: {
          status: "completed",
          completedBy: completedBy ? new ObjectId(completedBy) : null,
          completedByName: completedByName || "Unknown User",
          completedAt: new Date(),
          destinationRack: destinationRack,
          updatedAt: new Date(),
        },
      }
    );
    if (updateResult.modifiedCount === 1) {
      try {
        const product = await db.collection("products").findOne({ _id: new ObjectId(transfer.productId) });
        const productName = product?.productName || "Unknown Product";
        const fromProjectName = transfer.fromProjectId === "EXTERNAL" ? "External" : (await db.collection("Projects").findOne({ _id: new ObjectId(transfer.fromProjectId) }))?.projectName || "Unknown Project";
        const toProjectName = transfer.toProjectId === "EXTERNAL" ? "External" : (await db.collection("Projects").findOne({ _id: new ObjectId(transfer.toProjectId) }))?.projectName || "Unknown Project";
        const requesterUserId = transfer.requestedBy.toString();
        broadcastNotification({
          type: "targeted",
          targetUsers: [requesterUserId],
          notification: {
            message: "Transfer Request Completed",
            description: `Your transfer of ${moveQty} ${productName} from ${fromProjectName} to ${toProjectName} has been completed`,
            actionUrl: "/notifications"
          }
        });
        broadcastNotification({
          type: "targeted",
          targetRole: "admin",
          notification: {
            message: "Transfer Completed",
            description: `Transfer of ${moveQty} ${productName} from ${fromProjectName} to ${toProjectName} has been completed`,
            actionUrl: "/notifications"
          }
        });
      } catch (broadcastError) {
        console.error("Error broadcasting completion notification:", broadcastError);
      }
      return NextResponse.json({
        message: "Transfer completed successfully! Stock has been moved to the selected rack and stock on hold has been cleared.",
        success: true,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to update transfer completion status" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error completing transfer:", error);
    return NextResponse.json(
      { error: "Failed to complete transfer: " + error.message },
      { status: 500 }
    );
  }
}

async function performStockMovement(db, transfer, destinationRackDoc) {
  const { productId, fromProjectId, toProjectId, quantity, fromRack } = transfer;
  const sourceProject = await db.collection("Projects").findOne({
    _id: new ObjectId(fromProjectId),
  });
  if (!sourceProject) {
    throw new Error("Source project not found");
  }
  let remainingQuantity = quantity;
  if (fromRack) {
    const sourceRackDoc = await db.collection("racks").findOne({
      rackNumber: fromRack,
      _id: { $in: sourceProject.racks || [] },
      "products.product": new ObjectId(productId)
    });
    if (sourceRackDoc) {
      const productInRack = sourceRackDoc.products.find(
        p => p.product.toString() === productId.toString()
      );
      if (productInRack && productInRack.stock >= quantity) {
        await db.collection("racks").updateOne(
          {
            _id: sourceRackDoc._id,
            "products.product": new ObjectId(productId),
          },
          {
            $inc: { "products.$.stock": -quantity },
            $set: { updatedAt: new Date() },
          }
        );
        remainingQuantity = 0;
      } else {
        throw new Error(`Insufficient stock in specified source rack ${fromRack}`);
      }
    } else {
      throw new Error(`Source rack ${fromRack} not found or doesn't contain this product`);
    }
  } else {
    const sourceRacks = await db
      .collection("racks")
      .find({
        _id: { $in: sourceProject.racks || [] },
        "products.product": new ObjectId(productId),
      })
      .toArray();
    for (const rack of sourceRacks) {
      if (remainingQuantity <= 0) break;
      const productInRack = rack.products.find(
        p => p.product.toString() === productId.toString()
      );
      if (productInRack && productInRack.stock > 0) {
        const deductAmount = Math.min(remainingQuantity, productInRack.stock);
        await db.collection("racks").updateOne(
          {
            _id: rack._id,
            "products.product": new ObjectId(productId),
          },
          {
            $inc: { "products.$.stock": -deductAmount },
            $set: { updatedAt: new Date() },
          }
        );
        remainingQuantity -= deductAmount;
      }
    }
  }
  if (remainingQuantity > 0) {
    throw new Error(`Insufficient stock in source project. Could not deduct ${remainingQuantity} units.`);
  }
  const existingProduct = destinationRackDoc.products?.find(
    p => p.product.toString() === productId.toString()
  );
  if (existingProduct) {
    await db.collection("racks").updateOne(
      {
        _id: destinationRackDoc._id,
        "products.product": new ObjectId(productId),
      },
      {
        $inc: { "products.$.stock": quantity },
        $set: { updatedAt: new Date() },
      }
    );
  } else {
    await db.collection("racks").updateOne(
      { _id: destinationRackDoc._id },
      {
        $push: {
          products: {
            product: new ObjectId(productId),
            stock: quantity,
          },
        },
        $set: { updatedAt: new Date() },
      }
    );
  }
}

async function completeTransferIn(db, transfer, sourceRack, completedBy, completedByName) {
  try {
    const { productId, fromProjectId, toProjectId } = transfer;
    const moveQty = Number(transfer.approvedQuantity || transfer.quantity) || 0;
    const sourceProject = await db.collection("Projects").findOne({
      _id: new ObjectId(fromProjectId),
    });
    if (!sourceProject) {
      return NextResponse.json(
        { error: "Source project not found" },
        { status: 404 }
      );
    }
    const sourceRackDoc = await db.collection("racks").findOne({
      rackNumber: sourceRack,
      _id: { $in: sourceProject.racks || [] },
      "products.product": new ObjectId(productId)
    });
    if (!sourceRackDoc) {
      return NextResponse.json(
        { error: "Selected source rack not found in source project or doesn't contain this product" },
        { status: 400 }
      );
    }
    const productInSourceRack = sourceRackDoc.products.find(
      p => p.product.toString() === productId.toString()
    );
    if (!productInSourceRack || productInSourceRack.stock < moveQty) {
      return NextResponse.json(
        { error: `Insufficient stock in selected source rack. Available: ${productInSourceRack?.stock || 0}, Required: ${moveQty}` },
        { status: 400 }
      );
    }
    const destinationRackNumber = transfer.toRack;
    if (!destinationRackNumber) {
      return NextResponse.json(
        { error: "Destination rack not specified in transfer request" },
        { status: 400 }
      );
    }
    const destinationProject = await db.collection("Projects").findOne({
      _id: new ObjectId(toProjectId),
    });
    const destinationRackDoc = await db.collection("racks").findOne({
      rackNumber: destinationRackNumber,
      _id: { $in: destinationProject.racks || [] }
    });
    if (!destinationRackDoc) {
      return NextResponse.json(
        { error: "Destination rack not found in destination project" },
        { status: 400 }
      );
    }
    await performStockMovementTransferIn(db, { ...transfer, quantity: moveQty }, sourceRackDoc, destinationRackDoc);
    const updateResult = await db.collection("transfers").updateOne(
      { _id: transfer._id },
      {
        $set: {
          status: "completed",
          completedBy: completedBy ? new ObjectId(completedBy) : null,
          completedByName: completedByName || "Unknown User",
          completedAt: new Date(),
          sourceRack: sourceRack,
          updatedAt: new Date(),
        },
      }
    );
    if (updateResult.modifiedCount === 1) {
      try {
        const product = await db.collection("products").findOne({ _id: new ObjectId(transfer.productId) });
        const productName = product?.productName || "Unknown Product";
        const fromProjectName = transfer.fromProjectId === "EXTERNAL" ? "External" : (await db.collection("Projects").findOne({ _id: new ObjectId(transfer.fromProjectId) }))?.projectName || "Unknown Project";
        const toProjectName = transfer.toProjectId === "EXTERNAL" ? "External" : (await db.collection("Projects").findOne({ _id: new ObjectId(transfer.toProjectId) }))?.projectName || "Unknown Project";
        const requesterUserId = transfer.requestedBy.toString();
        broadcastNotification({
          type: "targeted",
          targetUsers: [requesterUserId],
          notification: {
            message: "Transfer IN Request Completed",
            description: `Your transfer IN request for ${moveQty} ${productName} from ${fromProjectName} to ${toProjectName} has been completed`,
            actionUrl: "/notifications"
          }
        });
        broadcastNotification({
          type: "targeted",
          targetRole: "admin",
          notification: {
            message: "Transfer IN Completed",
            description: `Transfer IN of ${moveQty} ${productName} from ${fromProjectName} to ${toProjectName} has been completed`,
            actionUrl: "/notifications"
          }
        });
      } catch (broadcastError) {
        console.error("Error broadcasting Transfer IN completion notification:", broadcastError);
      }
      return NextResponse.json({
        message: "Transfer IN completed successfully! Stock has been moved from the selected source rack to the destination rack.",
        success: true,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to update Transfer IN completion status" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error completing Transfer IN:", error);
    return NextResponse.json(
      { error: "Failed to complete Transfer IN: " + error.message },
      { status: 500 }
    );
  }
}

async function performStockMovementTransferIn(db, transfer, sourceRackDoc, destinationRackDoc) {
  const { productId, quantity } = transfer;
  await db.collection("racks").updateOne(
    {
      _id: sourceRackDoc._id,
      "products.product": new ObjectId(productId),
    },
    {
      $inc: { "products.$.stock": -quantity },
      $set: { updatedAt: new Date() },
    }
  );



  const existingProduct = destinationRackDoc.products?.find(
    p => p.product.toString() === productId.toString()
  );
  if (existingProduct) {
    await db.collection("racks").updateOne(
      {
        _id: destinationRackDoc._id,
        "products.product": new ObjectId(productId),
      },
      {
        $inc: { "products.$.stock": quantity },
        $set: { updatedAt: new Date() },
      }
    );
  } else {
    await db.collection("racks").updateOne(
      { _id: destinationRackDoc._id },
      {
        $push: {
          products: {
            product: new ObjectId(productId),
            stock: quantity,
          },
        },
        $set: { updatedAt: new Date() },
      }
    );
  }
}
