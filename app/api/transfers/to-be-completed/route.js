import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    
    const allProjects = await db.collection("Projects").find({}).toArray();
    const assignedProjectIds = new Set();
    for (const project of allProjects) {
      const isWarehouseManager = project.warehouseManager?.toString() === user._id.toString();
      const isAssignedManager = project.assignedManagers?.some(
        (managerId) => managerId.toString() === user._id.toString()
      );
      const isProjectUser = project.users?.some(
        (userId) => userId.toString() === user._id.toString()
      );
      const isAssignedProject = user.assignedProject?.toString() === project._id.toString();
      if (isWarehouseManager || isAssignedManager || isProjectUser || isAssignedProject) {
        assignedProjectIds.add(project._id.toString());
      }
    }
    if (assignedProjectIds.size === 0) {
      return NextResponse.json({ transfersByProduct: {} });
    }

    
    const approvedTransfers = await db.collection("transfers").find({
      toProjectId: { $in: Array.from(assignedProjectIds).map(id => new ObjectId(id)) },
      status: "approved"
    }).toArray();

    
    const transfersByProduct = {};
    for (const transfer of approvedTransfers) {
      const pid = transfer.productId.toString();
      if (!transfersByProduct[pid]) transfersByProduct[pid] = [];
      transfersByProduct[pid].push(transfer);
    }

    return NextResponse.json({ transfersByProduct });
  } catch (error) {
    console.error("to-be-completed transfers API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 