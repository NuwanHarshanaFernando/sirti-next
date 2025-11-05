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

    
    const user = await db.collection("users").findOne({ 
      email: session.user.email 
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    
    const allProjects = await db.collection("Projects").find({}).toArray();

    
    const product = await db.collection("products").findOne({
      _id: new ObjectId(productId)
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    

    
    
    const safetyProject = await db.collection("Projects").findOne({ projectName: "SAFETY" });
    if (safetyProject) {
      console.log(` SAFETY project found:`, {
        id: safetyProject._id,
        hasProduct: safetyProject.products?.some(p => p.productObjId?.toString() === productId),
        rackCount: safetyProject.racks?.length || 0,
        isProductIncluded: product.includedProjects?.length > 0 ? product.includedProjects?.some(id => id.toString() === safetyProject._id.toString()) : true
      });
    } else {
      console.log(` SAFETY project not found in database`);
    }    
    const isAdmin = user.role === 'admin';
    
    
    const assignedProjectIds = [];
    
    if (!isAdmin) {
      
      for (const project of allProjects) {
        const isWarehouseManager = project.warehouseManager?.toString() === user._id.toString();
        const isAssignedManager = project.assignedManagers?.some(
          (managerId) => managerId.toString() === user._id.toString()
        );
        const isInAvailableProjects = user.availaleProjects?.some(
          (availableId) => availableId.toString() === project._id.toString()
        );
        const isAssignedProject = user.assignedProject?.toString() === project._id.toString();

        if (isWarehouseManager || isAssignedManager || isInAvailableProjects || isAssignedProject) {
          assignedProjectIds.push(project._id.toString());
        }
      }
    }

    
    const projectsWithStock = await Promise.all(
      allProjects.map(async (project) => {
        let totalStockOnHand = 0;
        let totalStockOnHold = 0;
        const racks = [];
        const isUserLobby = project.isLobby === true && project.lobbyOwner?.toString?.() === user._id.toString();        
        if (project.racks && project.racks.length > 0) {
          const projectRacks = await db
            .collection("racks")
            .find({
              _id: { $in: project.racks.map((rackId) => new ObjectId(rackId)) },
            })
            .toArray();
          projectRacks.forEach((rack) => {
            const productInRack = rack.products?.find(
              (p) => p.product.toString() === productId
            );

            
            if (productInRack) {
              totalStockOnHand += productInRack.stock || 0;
              racks.push({
                rackNumber: rack.rackNumber,
                stock: productInRack.stock || 0,
                _id: rack._id,
                stockOnHold: 0 
              });
            } else {
              
              const hasProductAssignment = project.products?.some(
                (p) => p.productObjId?.toString() === productId
              );
              
              // Always show racks for the current user's Lobby, even without assignment
              if (hasProductAssignment || isAdmin || isUserLobby) {
                racks.push({
                  rackNumber: rack.rackNumber,
                  stock: 0,
                  _id: rack._id,
                  stockOnHold: 0 
                });
              }
            }
          });
        } else if (isAdmin) {
          
          console.log(`Project ${project.projectName} has no racks but showing for admin`);
        }        
        const stockOnHoldRecord = await db.collection("stockOnHold").findOne({
          projectId: new ObjectId(project._id),
          productId: new ObjectId(productId),
        });

        if (stockOnHoldRecord) {
          totalStockOnHold = stockOnHoldRecord.heldQuantity || 0;
        }
        
        
        if (racks.length > 0) {
          
          const rackStockOnHoldRecords = await db.collection("rackStockOnHold").find({
            projectId: new ObjectId(project._id),
            productId: new ObjectId(productId)
          }).toArray();
          
          
          if (rackStockOnHoldRecords.length > 0) {
            racks.forEach(rack => {
              const rackHoldRecord = rackStockOnHoldRecords.find(
                record => record.rackNumber === rack.rackNumber
              );
              
              if (rackHoldRecord) {
                rack.stockOnHold = rackHoldRecord.heldQuantity || 0;
              } else {
                
                
                rack.stockOnHold = 0;
              }
            });
          }
        }

        
        const hasProductAssignment = project.products?.some(
          (p) => p.productObjId?.toString() === productId
        );
        
        
        let isIncluded = product.includedProjects?.length > 0 
          ? product.includedProjects?.some((includedId) => includedId.toString() === project._id.toString())
          : true; 
        // Ensure the current user's Lobby is always visible regardless of product restrictions
        if (isUserLobby) {
          isIncluded = true;
        }
        
        if (!isIncluded) {
          console.log(` Project ${project.projectName} is not included for this product`);
        }

      

        return {
          _id: project._id,
          projectName: project.projectName,
          color: project.color,
          isLobby: !!project.isLobby,
          lobbyOwner: project.lobbyOwner || null,
          stockOnHand: totalStockOnHand,
          stockOnHold: totalStockOnHold,
          racks: racks,
          hasStock: totalStockOnHand > 0 || totalStockOnHold > 0,
          hasAssignment: hasProductAssignment,
          
          shouldShow: isIncluded
        };
      })
    );


    
    
    const relevantProjects = projectsWithStock.filter(project => project.shouldShow);
    

    if (isAdmin) {
      
      
      
      const allProjectIds = allProjects.map(project => project._id.toString());
      
      
      const projectsWithThisProduct = allProjects.filter(p => 
        p.products?.some(prod => prod.productObjId?.toString() === productId)
      );
      
      
      
      const adminProjectsWithDetails = allProjects.map((project) => {
        
        const projectWithStock = projectsWithStock.find(p => p._id.toString() === project._id.toString());
        
        if (projectWithStock) {
          
          return projectWithStock;
        } else {
          
          
          const isIncluded = product.includedProjects?.length > 0 
            ? product.includedProjects?.some((includedId) => includedId.toString() === project._id.toString())
            : true; 
          const isUserLobby = project.isLobby === true && project.lobbyOwner?.toString?.() === user._id.toString();
          if (isUserLobby) {
            // Always include user's Lobby for admin view as well
            isIncluded = true;
          }
          
          return {
            _id: project._id,
            projectName: project.projectName,
            color: project.color || "#cccccc",
            isLobby: !!project.isLobby,
            lobbyOwner: project.lobbyOwner || null,
            stockOnHand: 0,
            stockOnHold: 0,
            racks: [],
            hasStock: false,
            hasAssignment: projectsWithThisProduct.some(p => p._id.toString() === project._id.toString()),
            shouldShow: isIncluded
          };
        }
      }).filter(project => project.shouldShow); 
      
      adminProjectsWithDetails.slice(0, 5).forEach(p => {
        console.log(`- ${p.projectName}: stockOnHand=${p.stockOnHand}, hasAssignment=${p.hasAssignment}, racks=${p.racks.length}`);
      });
      
      
      const projectsWithStockCount = adminProjectsWithDetails.filter(p => p.stockOnHand > 0 || p.stockOnHold > 0).length;
      const projectsWithAssignmentCount = adminProjectsWithDetails.filter(p => p.hasAssignment).length;
      
      
      return NextResponse.json({
        success: true,
        product: {
          _id: product._id,
          productName: product.productName,
          productId: product.productId,
        },
        assignedProjects: adminProjectsWithDetails, 
        nonAssignedProjects: [], 
        totalProjects: adminProjectsWithDetails.length,
        isAdmin: true,
        debug: {
          projectsWithStock: projectsWithStockCount,
          projectsWithAssignment: projectsWithAssignmentCount
        }
      });
    } else {
      
      const assignedProjects = relevantProjects.filter(project => 
        assignedProjectIds.includes(project._id.toString())
      );
      
      const nonAssignedProjects = relevantProjects.filter(project => 
        !assignedProjectIds.includes(project._id.toString())
      );

      return NextResponse.json({
        success: true,
        product: {
          _id: product._id,
          productName: product.productName,
          productId: product.productId,
        },
        assignedProjects: assignedProjects,
        nonAssignedProjects: nonAssignedProjects,
        totalProjects: relevantProjects.length,
        isAdmin: false
      });
    }
  } catch (error) {
    console.error("Error fetching admin projects data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
