import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    
    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    
    const allProjects = await db.collection("Projects").find({}).toArray();

    
    const assignedProjects = allProjects.filter((project) => {
      const isWarehouseManager =
        project.warehouseManager?.toString() === user._id.toString();
      const isAssignedManager = project.assignedManagers?.some(
        (managerId) => managerId.toString() === user._id.toString()
      );
      const isInAssignedProject =
        user.assignedProject?.toString() === project._id.toString();

      
      const userProjects = user.availableProjects || user.availaleProjects || [];
      const isInUserProjects = userProjects.some(userProject => {
        const userProjectId = userProject._id || userProject.id || userProject;
        return userProjectId.toString() === project._id.toString();
      });

      return isWarehouseManager || isAssignedManager || isInAssignedProject || isInUserProjects;
    });

    
    const product = await db.collection("products").findOne({ _id: new ObjectId(productId) });
    const includedProjects = product?.includedProjects?.map(pid => pid.toString()) || [];

    
    const includedProjectObjects = allProjects.filter(project => {
      // Always allow user's Lobby through even if not explicitly included
      const isUserLobby = project.isLobby === true && project.lobbyOwner?.toString?.() === user._id.toString();
      return includedProjects.length > 0 
        ? isUserLobby || includedProjects.includes(project._id.toString())
        : true; 
    });

    
    const sourceProjectsMap = new Map();
    
    
    assignedProjects.forEach(project => {
      sourceProjectsMap.set(project._id.toString(), project);
    });
    
    
    includedProjectObjects.forEach(project => {
      sourceProjectsMap.set(project._id.toString(), project);
    });

    const sourceProjects = Array.from(sourceProjectsMap.values());

    
    const allRacksWithStock = [];

    for (const project of sourceProjects) {
      if (project.racks && project.racks.length > 0) {
        
        const projectRacks = await db
          .collection("racks")
          .find({
            _id: { $in: project.racks.map((rackId) => new ObjectId(rackId)) },
          })
          .toArray();

        
        for (const rack of projectRacks) {
          const productInRack = rack.products?.find(
            (p) => p.product.toString() === productId
          );

          
          if (productInRack && productInRack.stock > 0) {
            allRacksWithStock.push({
              rackNumber: rack.rackNumber,
              stock: productInRack.stock,
              projectId: project._id,
              projectName: project.projectName,
              projectColor: project.color,
              value: rack.rackNumber, 
              label: `${rack.rackNumber} (${project.projectName})`, 
              displayLabel: `${rack.rackNumber} (${productInRack.stock} units available)` 
            });
          }
        }
      }
    }



    return NextResponse.json({
      success: true,
      racks: allRacksWithStock,
      sourceProjects: sourceProjects.map(p => ({
        _id: p._id,
        projectName: p.projectName,
        color: p.color
      })),
      assignedProjects: assignedProjects.map(p => ({
        _id: p._id,
        projectName: p.projectName,
        color: p.color
      })),
      includedProjects: includedProjectObjects.map(p => ({
        _id: p._id,
        projectName: p.projectName,
        color: p.color
      }))
    });
  } catch (error) {
    console.error("Error fetching manager transfer source racks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
