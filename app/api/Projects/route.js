export async function PUT(req) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    // Expecting: { userId: string, removeFromProjects: [projectId, ...] }
    const { userId, removeFromProjects } = body;
    if (!userId || !Array.isArray(removeFromProjects)) {
      return NextResponse.json({ error: "userId and removeFromProjects[] required" }, { status: 400 });
    }
    for (const projectId of removeFromProjects) {
      if (!ObjectId.isValid(projectId)) continue;
      const project = await db.collection("Projects").findOne({ _id: new ObjectId(projectId) });
      if (!project) continue;
      const usersArr = Array.isArray(project.users)
        ? project.users.map(u => (u && u.toString ? u.toString() : String(u)))
        : [];
      const updatedUsers = usersArr.filter(uid => uid !== userId);
      await db.collection("Projects").updateOne(
        { _id: new ObjectId(projectId) },
        { $set: { users: updatedUsers, updatedAt: new Date() } }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error bulk updating projects:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req) {
  try {
    const { db } = await connectToDatabase();
    // Ensure each manager has a personal Lobby project with a default rack
    try {
      const session = await getServerSession(authOptions);
      const userEmail = session?.user?.email;
      if (userEmail) {
        const user = await db.collection("users").findOne({ email: userEmail });
        if (user && user._id) {
          // Check existing Lobby for this manager
          let existingLobby = await db.collection("Projects").findOne({
            isLobby: true,
            lobbyOwner: user._id,
          });
          if (!existingLobby) {
            // Create a default rack for the Lobby
            const shortId = user._id.toString().slice(-6).toUpperCase();
            const rackNumber = `LB-${shortId}`;
            let rackId = null;
            const existingRack = await db.collection("racks").findOne({
              rackNumber: { $regex: new RegExp(`^${rackNumber}$`, "i") },
            });
            if (existingRack) {
              // If existing rack not marked as Lobby, update it
              rackId = existingRack._id;
              if (!existingRack.isLobbyRack) {
                await db.collection("racks").updateOne(
                  { _id: existingRack._id },
                  { $set: { isLobbyRack: true, lobbyOwner: user._id, updatedAt: new Date() } }
                );
              }
            } else {
              const rackInsert = await db.collection("racks").insertOne({
                rackNumber,
                inventory: null,
                products: [],
                isLobbyRack: true,
                lobbyOwner: user._id,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              rackId = rackInsert.insertedId;
            }

    const lobbyProject = {
              projectId: `LOBBY-${shortId}`,
              projectName: `Lobby (LB)`,
              color: "#6B7280",
              warehouseLocation: null,
              warehouseManager: user._id,
              warehouseCapacity: null,
              warehouseContact: null,
              racks: rackId ? [rackId] : [],
              users: [user._id],
              assignedManagers: [user._id],
              products: [],
              isLobby: true,
              lobbyOwner: user._id,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            const insertRes = await db.collection("Projects").insertOne(lobbyProject);
            if (insertRes.insertedId) {
              existingLobby = { ...lobbyProject, _id: insertRes.insertedId };
            }
          } else {
            // Ensure Lobby has at least one LB rack assigned
            const shortId = user._id.toString().slice(-6).toUpperCase();
            const rackNumber = `LB-${shortId}`;
            let rackId = null;
            const existingRack = await db.collection("racks").findOne({
              rackNumber: { $regex: new RegExp(`^${rackNumber}$`, "i") },
            });
            if (existingRack) {
              rackId = existingRack._id;
              if (!existingRack.isLobbyRack || !existingRack.lobbyOwner || existingRack.lobbyOwner.toString?.() !== user._id.toString()) {
                await db.collection("racks").updateOne(
                  { _id: existingRack._id },
                  { $set: { isLobbyRack: true, lobbyOwner: user._id, updatedAt: new Date() } }
                );
              }
            } else {
              const rackInsert = await db.collection("racks").insertOne({
                rackNumber,
                inventory: null,
                products: [],
                isLobbyRack: true,
                lobbyOwner: user._id,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              rackId = rackInsert.insertedId;
            }

            if (rackId && (!Array.isArray(existingLobby.racks) || !existingLobby.racks.some(r => r.toString() === rackId.toString()))) {
              await db.collection("Projects").updateOne(
                { _id: existingLobby._id },
                { $addToSet: { racks: rackId }, $set: { updatedAt: new Date() } }
              );
            }
          }
        }
  }
    } catch (e) {
      // Non-fatal if session missing or errors occur; proceed to return projects
    }
    const projects = await db.collection("Projects").find({}).toArray();

    
    const enrichedProjects = [];
    
    for (const project of projects) {
      
      const userCount = project.users ? project.users.length : 0;
      
      
      
      let totalRealStocks = 0;
      let uniqueProductsCount = 0;
      const uniqueProductIds = new Set();

      if (project.racks && project.racks.length > 0) {
        
        const racks = await db
          .collection("racks")
          .find({ _id: { $in: project.racks } })
          .toArray();

        
        for (const rack of racks) {
          if (rack.products && rack.products.length > 0) {
            for (const productInRack of rack.products) {
              if (productInRack.stock && productInRack.stock > 0) {
                totalRealStocks += productInRack.stock;
                uniqueProductIds.add(productInRack.product.toString());
              }
            }
          }
        }
        
        uniqueProductsCount = uniqueProductIds.size;
      }

      
      let finalTotalStocks = totalRealStocks;
      let finalProductCount = uniqueProductsCount;
      
      if (totalRealStocks === 0 && project.products && project.products.length > 0) {
        
        finalTotalStocks = project.products.reduce((sum, p) => sum + (p.stocks || 0), 0);
        finalProductCount = project.products.length;
      }

      enrichedProjects.push({
        _id: project._id,
        projectName: project.projectName,
        color: project.color,
        projectId: project.projectId,
        isLobby: !!project.isLobby,
        lobbyOwner: project.lobbyOwner || null,
        userCount: userCount,
        productCount: finalProductCount, 
        rackCount: project.racks ? project.racks.length : 0,
        totalItems: finalTotalStocks, 
        totalStocks: finalTotalStocks, 
        lastOperation: project.updatedAt 
          ? new Date(project.updatedAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
          : new Date(project.createdAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        products: project.products || [],
        racks: project.racks || [],
        users: project.users || [],
      });
    }

    return NextResponse.json({ projects: enrichedProjects });
  } catch (error) {
    console.log("error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const {
      projectName,
      warehouseLocation,
      warehouseManager,
      color,
      warehouseCapacity,
      warehouseContact,
      racks,
    } = body;

     
    
    
    
    

    
    
    
    
    
    

    
    const manager = await db.collection("users").findOne({
      _id: new ObjectId(warehouseManager),
      role: { $in: ["manager", "admin"] },
    });

    if (!manager) {
      return NextResponse.json(
        {
          error:
            "Selected manager not found or doesn't have appropriate permissions",
        },
        { status: 400 }
      );
    }

    
    const existingProject = await db.collection("Projects").findOne({
      projectName: { $regex: new RegExp(`^${projectName}$`, "i") },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: "Project name already exists" },
        { status: 400 }
      );
    } 
    const projectCount = await db.collection("Projects").countDocuments();
    const projectId = `PRJ${String(projectCount + 1).padStart(3, "0")}`; 
    const newProject = {
      projectId,
      projectName,
      warehouseLocation,
      warehouseManager: new ObjectId(warehouseManager),
      color,
      warehouseCapacity,
      warehouseContact,
      racks: [], 
      users: [new ObjectId(warehouseManager)], 
      assignedManagers: [new ObjectId(warehouseManager)], 
      products: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("Projects").insertOne(newProject);

    if (result.insertedId) {
      
      const rackIds = [];
      if (racks && racks.length > 0) {
        const validRacks = racks.filter((rack) => rack.trim() !== "");

        for (const rackNumber of validRacks) {
          try {
            
            let rackToAddId = null;
            const existingRack = await db.collection("racks").findOne({
              rackNumber: { $regex: new RegExp(`^${rackNumber.trim()}$`, "i") },
            });

            if (existingRack) {
              
              rackToAddId = existingRack._id;
            } else {
              
              const newRack = {
                rackNumber: rackNumber.trim(),
                inventory: null, 
                products: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              const rackResult = await db
                .collection("racks")
                .insertOne(newRack);
              if (rackResult.insertedId) {
                rackToAddId = rackResult.insertedId;
              }
            }

            if (rackToAddId) {
              
              if (!rackIds.some(id => id.toString() === rackToAddId.toString())) {
                rackIds.push(rackToAddId);
              }
            }
          } catch (rackError) {
            console.error(`Error processing rack ${rackNumber}:`, rackError);
          }
        }

        
        if (rackIds.length > 0) {
          await db
            .collection("Projects")
            .updateOne(
              { _id: result.insertedId },
              { $set: { racks: rackIds } }
            );
          newProject.racks = rackIds;
        }
      } 
      await db.collection("users").updateOne(
        { _id: new ObjectId(warehouseManager) },
        {
          $set: { assignedProject: result.insertedId },
          $unset: { availaleProjects: "" }, 
        }
      );

      
      await db.collection("Projects").updateOne(
        { _id: result.insertedId },
        {
          $addToSet: { assignedManagers: new ObjectId(warehouseManager) },
        }
      );

      return NextResponse.json(
        {
          message: "Project created successfully",
          projectId: result.insertedId,
          project: newProject,
          racksCreated: rackIds.length,
        },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
