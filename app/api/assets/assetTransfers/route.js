export async function DELETE(request) {
  try {
    const { db } = await connectToDatabase();
    const { assetId } = await request.json();
    if (!assetId) {
      return NextResponse.json({ error: "assetId is required" }, { status: 400 });
    }
    const result = await db.collection("assetTransfers").deleteMany({ assetId });
    return NextResponse.json({ deletedCount: result.deletedCount }, { status: 200 });
  } catch (error) {
    console.error("[ASSET_TRANSFERS_DELETE_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { sendMail } from "@/lib/mailer";

async function getAdminEmails(db) {
  const admins = await db
    .collection("users")
    .find({ role: "admin" }, { projection: { email: 1 } })
    .toArray();
  return admins.map((a) => a?.email).filter((e) => typeof e === "string" && e.includes("@"));
}

async function getProjectRelatedEmails(db, projectId) {
  try {
    if (!projectId) return [];
    let projId = null;
    if (typeof projectId === "string" && ObjectId.isValid(projectId)) projId = new ObjectId(projectId);
    if (projectId && projectId._id) {
      const s = projectId._id?.toString?.();
      if (s && ObjectId.isValid(s)) projId = new ObjectId(s);
    }
    if (!projId) return [];
    const project = await db
      .collection("Projects")
      .findOne({ _id: projId }, { projection: { warehouseManager: 1, assignedManagers: 1, users: 1, projectName: 1, isLobby: 1, lobbyOwner: 1 } });
    if (!project) return [];
    const idSet = new Set();
    if (project.warehouseManager) idSet.add(project.warehouseManager.toString());
    (project.assignedManagers || []).forEach((id) => id && idSet.add(id.toString()));
    (project.users || []).forEach((id) => id && idSet.add(id.toString()));
    if (project.isLobby && project.lobbyOwner) idSet.add(project.lobbyOwner.toString());
    const ids = Array.from(idSet).map((id) => new ObjectId(id));
    const orConds = [
      { role: "admin" },
      { assignedProject: projId },
      { assignedProject: projId.toString() },
      { availaleProjects: projId },
      { availaleProjects: projId.toString() },
    ];
    if (ids.length > 0) {
      orConds.push({ _id: { $in: ids } });
    }
    const users = await db
      .collection("users")
      .find({ $or: orConds }, { projection: { email: 1 } })
      .toArray();
    return users.map((u) => u?.email).filter((e) => typeof e === "string" && e.includes("@"));
  } catch (e) {
    console.warn("getProjectRelatedEmails failed:", e?.message || e);
    return [];
  }
}

function renderAssetTransferEmailHTML(details) {
  const fmt = (v) => (v === undefined || v === null || v === "" ? "-" : v);
  const rows = [
    ["Asset Name", fmt(details.assetName)],
    ["Asset Code", fmt(details.productCode)],
    ["Serial Number", fmt(details.serialNumber)],
    ["Manufacturer", fmt(details.manufacturer)],
    ["Category", fmt(details.productCategory)],
    ["Value/Price", fmt(details.productPrice)],
    ["Dimensions", fmt(details.productDimensions)],
    ["Weight", fmt(details.productWeight)],
    ["Purchase Date", fmt(details.purchaseDate)],
    ["Next Service Date", fmt(details.nextServiceDate)],
    ["Service Term (days)", fmt(details.serviceTerm)],
    ["Project", fmt(details.projectName)],
    ["Status", fmt(details.status)],
    ["From User", fmt(details.fromUserName)],
    ["From User Email", fmt(details.fromUserEmail)],
    ["To User", fmt(details.toUserName)],
    ["To User Email", fmt(details.toUserEmail)],
    ["Asset Manager", fmt(details.assetsManagerName)],
    ["Reason", fmt(details.transferReason)],
    ["Transfer Date", fmt(details.transferDate?.toLocaleString?.() || details.transferDate)],
    ["Asset Id", fmt(details.assetId)],
  ];
  return `
  <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111">
    <h2 style="margin:0 0 8px 0">Asset Transfer</h2>
    <p style="margin:0 0 12px 0">An asset has been transferred. Details are below:</p>
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

function buildAssetTransferText(details) {
  const lines = [
    `Asset Name: ${details.assetName}`,
    `Asset Code: ${details.productCode || "-"}`,
    `Serial Number: ${details.serialNumber || "-"}`,
    `Manufacturer: ${details.manufacturer || "-"}`,
    `Category: ${details.productCategory || "-"}`,
    `Value/Price: ${details.productPrice || "-"}`,
    `Dimensions: ${details.productDimensions || "-"}`,
    `Weight: ${details.productWeight || "-"}`,
    `Purchase Date: ${details.purchaseDate || "-"}`,
    `Next Service Date: ${details.nextServiceDate || "-"}`,
    `Service Term (days): ${details.serviceTerm || "-"}`,
    `Project: ${details.projectName || "-"}`,
    `Status: ${details.status || "-"}`,
    `From User: ${details.fromUserName || "-"} ${details.fromUserEmail ? `<${details.fromUserEmail}>` : ""}`,
    `To User: ${details.toUserName || "-"} ${details.toUserEmail ? `<${details.toUserEmail}>` : ""}`,
    `Asset Manager: ${details.assetsManagerName || "-"}`,
    `Reason: ${details.transferReason || "-"}`,
    `Transfer Date: ${details.transferDate ? new Date(details.transferDate).toLocaleString() : "-"}`,
    `Asset Id: ${details.assetId}`,
  ];
  return lines.join("\n");
}

export async function GET(request) {
  try {
    const { db } = await connectToDatabase();
    const url = new URL(request.url, `http://${request.headers.get("host")}`);
    const assetId = url.searchParams.get("id");
    const { ObjectId } = await import("mongodb");

    // Build match stage
    const matchStage = assetId ? { assetId } : {};

    // Aggregate with lookups for user names
const assetTransfers = await db.collection("assetTransfers").aggregate([
  { $match: matchStage },
  {
    $addFields: {
      fromUser: { $toObjectId: "$fromUser" },
      toUser: { $toObjectId: "$toUser" }
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "toUser",
      foreignField: "_id",
      as: "toUserObj"
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "fromUser",
      foreignField: "_id",
      as: "fromUserObj"
    }
  },
  {
    $addFields: {
      toUserName: { $arrayElemAt: ["$toUserObj.name", 0] },
      fromUserName: { $arrayElemAt: ["$fromUserObj.name", 0] }
    }
  },
  {
    $project: {
      toUserObj: 0,
      fromUserObj: 0
    }
  }
]).toArray();


    return NextResponse.json(assetTransfers, { status: 200 });
  } catch (error) {
    console.error("[ASSETS_GET_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
export async function POST(request) {
  try {
    const assetTransferData = await request.json();
    const { db } = await connectToDatabase();
    // Validate required fields
    if (
      !assetTransferData.id ||
      !assetTransferData.toUser ||
      !assetTransferData.transferReason ||
      !assetTransferData.fromUser
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const toUserFromRequest = assetTransferData.toUser;
    const toUserName = await db
      .collection("users")
      .findOne({ _id: new ObjectId(toUserFromRequest) });


    // Insert new asset transfer record
    const result = await db.collection("assetTransfers").insertOne({
      assetId: assetTransferData.id,
      fromUser: assetTransferData.fromUser || null,
      toUser: assetTransferData.toUser,
      transferReason: assetTransferData.transferReason,
      transferDate: new Date(),
    });
    // Send notification emails (best-effort)
    try {
      // Load fresh details from DB
      const asset = await db
        .collection("assets")
        .findOne({ _id: new ObjectId(assetTransferData.id) });
      // Resolve users
      const [fromUserDoc, toUserDoc] = await Promise.all([
        assetTransferData.fromUser && ObjectId.isValid(assetTransferData.fromUser)
          ? db.collection("users").findOne({ _id: new ObjectId(assetTransferData.fromUser) })
          : null,
        ObjectId.isValid(assetTransferData.toUser)
          ? db.collection("users").findOne({ _id: new ObjectId(assetTransferData.toUser) })
          : null,
      ]);
      // Resolve manager
      let assetsManagerName = "Unassigned";
      try {
        const am = asset?.assetsManager;
        if (am && ((typeof am === "string" && ObjectId.isValid(am)) || am?._id)) {
          const amId = am?._id ? new ObjectId(am._id) : new ObjectId(am);
          const mgr = await db.collection("users").findOne({ _id: amId });
          if (mgr?.name) assetsManagerName = mgr.name;
        }
      } catch {}
      // Resolve project
      let projectName = null;
      let projectIdForEmails = null;
      try {
        const pid = asset?.projectId?._id ? asset.projectId._id.toString() : asset?.projectId?.toString?.();
        if (pid && ObjectId.isValid(pid)) {
          projectIdForEmails = pid;
          const proj = await db.collection("Projects").findOne({ _id: new ObjectId(pid) }, { projection: { projectName: 1 } });
          projectName = proj?.projectName || null;
        }
      } catch {}
      const details = {
        assetName: asset?.productName || asset?.assetName || "Unknown Asset",
        productCode: asset?.productCode || "-",
        serialNumber: asset?.serialNumber || asset?.serialNo || "-",
        manufacturer: asset?.manufacturer || asset?.manufacture || "-",
        productCategory: asset?.productCategory || asset?.category || "-",
        productPrice: asset?.productValue || asset?.productPrice || "-",
        productDimensions: asset?.dimensions || asset?.productDimensions || "-",
        productWeight: asset?.weight || asset?.productWeight || "-",
        purchaseDate: asset?.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "-",
        nextServiceDate: asset?.nextServiceDate ? new Date(asset.nextServiceDate).toLocaleDateString() : "-",
        serviceTerm: asset?.serviceTerm || "-",
        projectName: projectName || "-",
        status: asset?.status || "Operational",
        fromUserName: fromUserDoc?.name || "Unassigned",
        fromUserEmail: fromUserDoc?.email || "-",
        toUserName: toUserDoc?.name || "-",
        toUserEmail: toUserDoc?.email || "-",
        assetsManagerName,
        transferReason: assetTransferData.transferReason || "-",
        transferDate: new Date(),
        assetId: assetTransferData.id,
      };
      const subject = `Asset Transfer - ${details.assetName}`;
      const text = buildAssetTransferText(details);
      const html = renderAssetTransferEmailHTML(details);
  const adminEmails = await getAdminEmails(db);
  const projectEmails = await getProjectRelatedEmails(db, projectIdForEmails);
  const toUserEmail = toUserDoc?.email ? [toUserDoc.email] : [];
  const recipients = Array.from(new Set([...(adminEmails || []), ...(projectEmails || []), ...toUserEmail].filter(Boolean)));
      if (recipients.length > 0) {
        // Email-once guard for asset transfer record
        let shouldSend = false;
        try {
          const guardRes = await db.collection('assetTransfers').updateOne(
            { _id: result.insertedId, 'emailEvents.created': { $exists: false } },
            { $set: { 'emailEvents.created': new Date() } }
          );
          shouldSend = guardRes.modifiedCount === 1;
        } catch {}
        if (!shouldSend) {
          try { console.log('[email-skip] Asset transfer email already sent for record', result.insertedId?.toString?.()); } catch {}
        }
        if (shouldSend) {
          try { console.log('[email] ASSET TRANSFER: sending to', recipients.length, 'recipients for asset', assetTransferData.id); } catch {}
          await sendMail({ to: recipients, subject, text, html });
        }
      }
    } catch (mailErr) {
      console.warn("Asset transfer email failed:", mailErr?.message || mailErr);
    }
    return NextResponse.json({ id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("[ASSET_TRANSFER_POST_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
