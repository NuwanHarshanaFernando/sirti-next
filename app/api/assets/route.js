export async function DELETE(request) {
  try {
    const { db } = await connectToDatabase();
    const { id } = await request.json();
    const { ObjectId } = await import("mongodb");
    if (!id) {
      return NextResponse.json(
        { error: "Asset id is required" },
        { status: 400 }
      );
    }
    const result = await db
      .collection("assets")
      .deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    return NextResponse.json(
      { message: "Asset deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[ASSETS_DELETE_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request) {
  try {
    const { db } = await connectToDatabase();
    const url = new URL(request.url, `http://${request.headers.get("host")}`);
    const id = url.searchParams.get("id");
    const { ObjectId } = await import("mongodb");

    if (id) {
      let asset;
      try {
        asset = await db
          .collection("assets")
          .findOne({ _id: new ObjectId(id) });
      } catch {
        return NextResponse.json(
          { error: "Invalid asset id" },
          { status: 400 }
        );
      }
      if (!asset) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }

      let assignedUserName = "Unassigned";
      if (asset.assignedUser) {
        const assignedUserHere = await db
          .collection("users")
          .findOne({ _id: new ObjectId(asset.assignedUser) });
        if (assignedUserHere && assignedUserHere.name) {
          assignedUserName = assignedUserHere.name;
        }
      }
      let assignedManagerName = "Unassigned";
      if (
        asset.assetsManager &&
        typeof asset.assetsManager === "string" &&
        /^[a-fA-F0-9]{24}$/.test(asset.assetsManager)
      ) {
        try {
          const manager = await db
            .collection("users")
            .findOne({ _id: new ObjectId(asset.assetsManager) });
          if (manager && manager.name) {
            assignedManagerName = manager.name;
          }
        } catch (e) {

        }
      }
      const assetFormatted = {
        id: asset._id.toString(),
        productName: asset.productName || "Unknown Product",
        assignedUser: asset.assignedUser || null,
        assignedUserName,
        nextServiceDate: asset.nextServiceDate || null,
        serviceTerm: asset.serviceTerm || "30",
        productCode: asset.productCode || "N/A",
        productPrice: asset.productValue || "0.00",
        productDimensions: asset.dimensions || "N/A",
        productWeight: asset.weight || "N/A",
        serialNumber: asset.serialNumber || asset.serialNo || "N/A",
        manufacturer: asset.manufacture || "N/A",
        purchaseDate: asset.purchaseDate || "N/A",
        selectedImage: asset.selectedImage || asset.productImage || "N/A",
        productCategory: asset.productCategory || asset.category || "N/A",
        assetsManager: asset.assetsManager || null,
        assetsManagerName: assignedManagerName,
        attachmentPath: asset.attachmentPath || "",
        certificate: asset.certificate || null,
        projectId: asset.projectId || null,
        status: asset.status || "Operational",
      };

      const assignedUserId = asset.assignedUser;
      const nonAssignedUsers = await db
        .collection("users")
        .aggregate([
          {
            $match: {
              role: { $ne: "admin" },
            },
          },
          // ...
        ])
        .toArray();

      return NextResponse.json(
        { asset: assetFormatted, nonAssignedUsers },
        { status: 200 }
      );
    }

    let assetsQuery = {};
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.role === "manager") {
        const user = await db
          .collection("users")
          .findOne({ email: session.user.email });
        if (user) {
          const projectIdStrings = new Set();
          const projectObjIds = new Set();
          const pushId = (val) => {
            if (!val) return;
            try {
              const asString = val.toString();
              projectIdStrings.add(asString);
            } catch {}
            try {
              const asObj = new ObjectId(val);
              projectObjIds.add(asObj);
            } catch {}
          };
          if (user.assignedProject) pushId(user.assignedProject);
          const avail1 = user.availaleProjects || [];
          const avail2 = user.availableProjects || [];
          const projectsArr = Array.isArray(avail1) && avail1.length > 0 ? avail1 : avail2;
          for (const p of projectsArr) {
            if (p && p._id) {
              pushId(p._id);
            } else {
              pushId(p);
            }
          }
          if (projectIdStrings.size === 0 && projectObjIds.size === 0) {
            const relatedProjects = await db.collection("Projects").find({
              $or: [
                { warehouseManager: user._id },
                { assignedManagers: user._id },
                { users: user._id },
                { _id: user.assignedProject ? new ObjectId(user.assignedProject) : undefined },
              ].filter(Boolean),
            }).toArray();
            for (const prj of relatedProjects) {
              pushId(prj._id);
            }
          }
          const idStrings = Array.from(projectIdStrings);
          const idObjs = Array.from(projectObjIds);
          if (idStrings.length > 0 || idObjs.length > 0) {
            assetsQuery = {
              $or: [
                idObjs.length > 0 ? { projectId: { $in: idObjs } } : null,
                idStrings.length > 0 ? { projectId: { $in: idStrings } } : null,
              ].filter(Boolean),
            };
          } else {
            assetsQuery = { _id: { $exists: false } }; // no assets
          }
        }
      }
    } catch (e) {
    }

    const assets = await db.collection("assets").find(assetsQuery).toArray();

    const formattedAssets = await Promise.all(
      assets.map(async (asset) => {
        let assignedUserName = "Unassigned";
        let assignedManagerName = "Unassigned";
        let projectName = null;
        let projectColor = null;
        if (
          asset.assetsManager &&
          typeof asset.assetsManager === "string" &&
          /^[a-fA-F0-9]{24}$/.test(asset.assetsManager)
        ) {
          try {
            const manager = await db
              .collection("users")
              .findOne({ _id: new ObjectId(asset.assetsManager) });
            if (manager && manager.name) {
              assignedManagerName = manager.name;
            }
          } catch (e) {
          }
        }
        if (
          asset.assignedUser &&
          typeof asset.assignedUser === "string" &&
          /^[a-fA-F0-9]{24}$/.test(asset.assignedUser)
        ) {
          try {
            const assignedUser = await db
              .collection("users")
              .findOne({ _id: new ObjectId(asset.assignedUser) });
            if (assignedUser && assignedUser.name) {
              assignedUserName = assignedUser.name;
            }
          } catch (e) {
          }
        }
        if (
          asset.projectId &&
          ((typeof asset.projectId === "string" && /^[a-fA-F0-9]{24}$/.test(asset.projectId)) || asset.projectId._id)
        ) {
          try {
            const pid = asset.projectId._id ? asset.projectId._id : asset.projectId;
            const project = await db
              .collection("Projects")
              .findOne({ _id: new ObjectId(pid) });
            if (project) {
              projectName = project.projectName || null;
              projectColor = project.color || null;
            }
          } catch (e) {
          }
        }
        let projectIdString = null;
        try {
          projectIdString = asset.projectId
            ? (asset.projectId._id ? asset.projectId._id.toString() : asset.projectId.toString())
            : null;
        } catch (e) {
          projectIdString = null;
        }
        return {
          ...asset,
          assignedUserName,
          assignedManagerName,
          projectName,
          projectColor,
          projectId: projectIdString,
          status: asset.status || "Operational",
        };
      })
    );

    return NextResponse.json(formattedAssets, { status: 200 });
  } catch (error) {
    console.error("[ASSETS_GET_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const assetData = await request.json();
    // Validate inlined certificate payload if present
    if (assetData && assetData.certificate) {
      const c = assetData.certificate;
      if (!c.base64 || !c.contentType) {
        return NextResponse.json({ error: "Invalid certificate payload" }, { status: 400 });
      }
      // Optionally enforce size/type limits server-side
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf'
      ];
      if (!allowedTypes.includes(c.contentType)) {
        return NextResponse.json({ error: 'Invalid certificate type. Only images and PDF allowed.' }, { status: 400 });
      }
      const approxSize = Math.ceil((c.base64.length * 3) / 4);
      const maxSize = 10 * 1024 * 1024;
      if (approxSize > maxSize) {
        return NextResponse.json({ error: 'Certificate too large. Max 10MB.' }, { status: 400 });
      }
    }

    const { db } = await connectToDatabase();
    const result = await db.collection("assets").insertOne(assetData);

    try {
      const insertedId = result.insertedId?.toString();
      if (insertedId && assetData?.nextServiceDate) {
        await db.collection("AssetHistory").insertOne({
          assetId: insertedId,
          action: "service_date_set",
          userName: assetData?.updatedBy || "System",
          timestamp: new Date(assetData.nextServiceDate),
        });
      }
      if (insertedId && assetData?.purchaseDate) {
        await db.collection("AssetHistory").insertOne({
          assetId: insertedId,
          action: "purchase_recorded",
          userName: assetData?.updatedBy || "System",
          timestamp: new Date(assetData.purchaseDate),
        });
      }
    } catch (e) {
    }

    return NextResponse.json(result.ops?.[0] || assetData, { status: 201 });
  } catch (error) {
    console.error("[ASSETS_INSERT_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { db } = await connectToDatabase();
    const assetData = await request.json();
    const { id, updateData } = assetData;
    const { ObjectId } = await import("mongodb");

    if (!id) {
      return NextResponse.json(
        { error: "Asset id is required" },
        { status: 400 }
      );
    }


    // Validate certificate in update path
    if (updateData && updateData.certificate) {
      const c = updateData.certificate;
      if (!c.base64 || !c.contentType) {
        return NextResponse.json({ error: "Invalid certificate payload" }, { status: 400 });
      }
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf'
      ];
      if (!allowedTypes.includes(c.contentType)) {
        return NextResponse.json({ error: 'Invalid certificate type. Only images and PDF allowed.' }, { status: 400 });
      }
      const approxSize = Math.ceil((c.base64.length * 3) / 4);
      const maxSize = 10 * 1024 * 1024;
      if (approxSize > maxSize) {
        return NextResponse.json({ error: 'Certificate too large. Max 10MB.' }, { status: 400 });
      }
    }

    const updateFields = { ...updateData, updatedAt: new Date() };

    let existing = null;
    try {
      existing = await db.collection("assets").findOne({ _id: new ObjectId(id) });
    } catch (e) {
      existing = null;
    }

    const result = await db
      .collection("assets")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    try {
      const prevDate = existing?.nextServiceDate || null;
      const nextDate = updateData?.nextServiceDate || null;
      if (nextDate && nextDate !== prevDate) {
        await db.collection("AssetHistory").insertOne({
          assetId: id,
          action: "service_date_set",
          userName: updateData?.updatedBy || "System",
          timestamp: new Date(nextDate),
        });
      }
      const prevPurchase = existing?.purchaseDate || null;
      const nextPurchase = updateData?.purchaseDate || null;
      if (nextPurchase && nextPurchase !== prevPurchase) {
        await db.collection("AssetHistory").insertOne({
          assetId: id,
          action: "purchase_date_set",
          userName: updateData?.updatedBy || "System",
          timestamp: new Date(nextPurchase),
        });
      }
      const prevTerm = existing?.serviceTerm ?? null;
      const nextTerm = updateData?.serviceTerm ?? null;
      if (nextTerm && nextTerm !== prevTerm) {
        await db.collection("AssetHistory").insertOne({
          assetId: id,
          action: "service_term_updated",
          userName: updateData?.updatedBy || "System",
          timestamp: new Date(),
          meta: { previous: prevTerm, current: nextTerm }
        });
      }
    } catch (e) {
    }

    return NextResponse.json(
      { message: "Asset updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[ASSETS_UPDATE_ERROR]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
