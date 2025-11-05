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

    const userRole = user.role;

    
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

    
    const nonAssignedProjects = allProjects.filter((project) => {
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

      const isAssigned = isWarehouseManager || isAssignedManager || isInAssignedProject || isInUserProjects;
      
      
      const isIncluded = includedProjects.length > 0 
        ? includedProjects.includes(project._id.toString())
        : true; 

      return !isAssigned && isIncluded;
    });
    
    const assignedProjectsFiltered = includedProjects.length > 0 
      ? assignedProjects.filter(project => {
          const isUserLobby = project.isLobby === true && project.lobbyOwner?.toString?.() === user._id.toString();
          return isUserLobby || includedProjects.includes(project._id.toString());
        })
      : assignedProjects; 

    
  const assignedProjectsWithRacks = await Promise.all(
      assignedProjectsFiltered.map(async (project) => {
    const isUserLobby = project.isLobby === true && project.lobbyOwner?.toString?.() === user._id.toString();
        const racks = [];

        if (project.racks && project.racks.length > 0) {
          
          const projectRacks = await db
            .collection("racks")
            .find({
              _id: { $in: project.racks.map((rackId) => new ObjectId(rackId)) },
            })
            .toArray();          
      for (const rack of projectRacks) {
            
            let productInRack = null;
            
            if (Array.isArray(rack.products)) {
              productInRack = rack.products.find(
                (p) => p.product.toString() === productId
              );
            } else if (Array.isArray(rack.inventory)) {
              
              productInRack = rack.inventory.find(
                (p) => p.product?.toString() === productId
              );
            }

            
            const rackStockOnHoldRecord = await db.collection("rackStockOnHold").findOne({
              rackNumber: rack.rackNumber,
              projectId: new ObjectId(project._id),
              productId: new ObjectId(productId)
            });
            
            const rackStockOnHold = rackStockOnHoldRecord ? rackStockOnHoldRecord.heldQuantity : 0;

            
            racks.push({
              rackNumber: rack.rackNumber,
        // For the user's Lobby, always show the rack even if no product stock yet
        stockOnHand: (productInRack?.stock || 0),
              stockOnHold: rackStockOnHold, 
              rackId: rack._id, 
            });
          }
        }
        return {
          ...project,
          ProjectName: project.projectName, 
          ProjectColor: project.color, 
      isLobby: !!project.isLobby,
      lobbyOwner: project.lobbyOwner || null,
          racks: racks,
        };
      })
    );    
    const nonAssignedProjectsWithStock = await Promise.all(
      nonAssignedProjects.map(async (project) => {        let totalStockOnHand = 0;
        let totalStockOnHold = 0;

        
        const stockOnHoldRecord = await db.collection("stockOnHold").findOne({
          projectId: new ObjectId(project._id),
          productId: new ObjectId(productId)
        });
        
        totalStockOnHold = stockOnHoldRecord ? stockOnHoldRecord.heldQuantity : 0;

        
        if (project.racks && project.racks.length > 0) {
          const projectRacks = await db
            .collection("racks")
            .find({
              _id: { $in: project.racks.map((rackId) => new ObjectId(rackId)) },
            })
            .toArray();          
          projectRacks.forEach((rack) => {
            
            let productInRack = null;
            
            if (Array.isArray(rack.products)) {
              productInRack = rack.products.find(
                (p) => p.product.toString() === productId
              );
            } else if (Array.isArray(rack.inventory)) {
              
              productInRack = rack.inventory.find(
                (p) => p.product?.toString() === productId
              );
            }
            
            if (productInRack) {
              totalStockOnHand += productInRack.stock || 0;
              
              
            }
          });
        } else {
          
          const productInProject = project.products?.find(
            (p) => p.productObjId.toString() === productId
          );

          if (productInProject) {
            totalStockOnHand = productInProject.stocks || 0;
          }
        }

        return {
          ...project,
          stockOnHand: totalStockOnHand,
          stockOnHold: totalStockOnHold,
          pendingApprovals: 0, 
        };
      })
    );

    return NextResponse.json({
      userRole,
      assignedProjects: assignedProjectsWithRacks,
      nonAssignedProjects: nonAssignedProjectsWithStock,
      allProjects: allProjects,
    });
  } catch (error) {
    console.error("Error fetching manager assigned projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
