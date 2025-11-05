import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import ProjectUserAssignmentService from "@/lib/services/ProjectUserAssignmentService";


export async function GET(request, { params }) {
  try {
    const { db } = await connectToDatabase();
    
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid project ID" },
        { status: 400 }
      );
    }

    
    const project = await db.collection("Projects").findOne({ _id: new ObjectId(id) });

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 }
      );
    }



    
    let populatedUsers = [];
    if (project.users && project.users.length > 0) {
      try {
        
        const userIds = project.users.map(userId => 
          typeof userId === 'string' ? new ObjectId(userId) : userId
        );
        const users = await db.collection("users").find(
          { _id: { $in: userIds } }, 
          { projection: { name: 1, email: 1 } }
        ).toArray();
        populatedUsers = users;
      } catch (userError) {
        console.log('Could not populate users:', userError.message);
        populatedUsers = [];
      }
    }

    
    let populatedRacks = [];
    if (project.racks) {
      try {
        if (typeof project.racks === 'string') {
          
          if (project.racks.trim() === '') {
            populatedRacks = [];
          } else if (ObjectId.isValid(project.racks.split(' ')[0])) {
            
            const rackIds = project.racks.split(' ').filter(id => id.trim() && ObjectId.isValid(id));
            const rackObjectIds = rackIds.map(id => new ObjectId(id));
            const racks = await db.collection("racks").find(
              { _id: { $in: rackObjectIds } }, 
              { projection: { rackNumber: 1, location: 1, capacity: 1 } }
            ).toArray();
            populatedRacks = racks;
          } else {
            
            const rackNames = project.racks.split(' ').filter(name => name.trim());
            populatedRacks = rackNames.map(rackName => ({
              _id: null,
              rackNumber: rackName,
              location: 'Unknown',
              capacity: 100
            }));
          }
        } else if (Array.isArray(project.racks)) {

          
          const rackObjectIds = project.racks
              .filter(id => id) 
              .map(id => {
                if (id instanceof ObjectId) {
                  return id;
                } else if (typeof id === 'string' && ObjectId.isValid(id)) {
                  return new ObjectId(id);
                }
                return null; 
              })
              .filter(id => id !== null); 


          if (rackObjectIds.length > 0) {
            const racks = await db.collection("racks").find(
              { _id: { $in: rackObjectIds } }, 
              { projection: { rackNumber: 1, location: 1, capacity: 1 } }
            ).toArray();
            populatedRacks = racks;
          } else {
            populatedRacks = [];
          }
        } else {
          populatedRacks = [];
        }
      } catch (rackError) {
        console.error('Error during racks population:', rackError.message);
        populatedRacks = [];
      }
    }


    return NextResponse.json({
      success: true,
      project: {
        ...project,
        users: populatedUsers,
        racks: populatedRacks
      }
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch project", error: error.message },
      { status: 500 }
    );
  }
}


export async function PUT(request, { params }) {
  try {
    const { db } = await connectToDatabase();
    
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid project ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      projectName,
      warehouseLocation = null,
      warehouseManager = null,
      color,
      warehouseCapacity = null,
      warehouseContact = null,
      racks,
      users 
    } = body;
    console.log("Received PUT request for project ID:", id);
    console.log("Updating project with data:",body);
    
    if (!projectName || !projectName.trim()) {
      return NextResponse.json(
        { success: false, message: "Project name is required" },
        { status: 400 }
      );
    }

    
    const existingProject = await db.collection("Projects").findOne({ _id: new ObjectId(id) });
    if (!existingProject) {
      return NextResponse.json(
        { success: false, message: "Project not found for update" },
        { status: 404 }
      );
    }

    
    let managerObjId = null;
    if (warehouseManager && warehouseManager.trim() !== '') {
      if (!ObjectId.isValid(warehouseManager)) {
        return NextResponse.json(
          { success: false, message: "Invalid warehouse manager ID" },
          { status: 400 }
        );
      }
      const manager = await db.collection("users").findOne({ _id: new ObjectId(warehouseManager) });
      if (!manager) {
        return NextResponse.json(
          { success: false, message: "Warehouse manager not found" },
          { status: 400 }
        );
      }
      managerObjId = new ObjectId(warehouseManager);
    }

    let validatedRacks = [];
    if (racks && racks.length > 0) {
      
      const invalidRackIds = racks.filter(rackId => !ObjectId.isValid(rackId));
      if (invalidRackIds.length > 0) {
        return NextResponse.json(
          { success: false, message: "One or more rack IDs are invalid" },
          { status: 400 }
        );
      }
      const rackObjectIds = racks.map(rackId => new ObjectId(rackId));
      const existingRacksInDB = await db.collection("racks").find({ _id: { $in: rackObjectIds } }).toArray();
      
      if (existingRacksInDB.length !== racks.length) {
        return NextResponse.json(
          { success: false, message: "One or more racks not found" },
          { status: 400 }
        );
      }
      validatedRacks = rackObjectIds;
    } else {
      
      validatedRacks = existingProject.racks && Array.isArray(existingProject.racks) 
                         ? existingProject.racks.map(rackId => new ObjectId(rackId.toString())) 
                         : [];
    }

    
    const updateData = {
      projectName,
      warehouseLocation: warehouseLocation || null,
      warehouseManager: managerObjId,
      color: color || existingProject.color || '#E27100',
      warehouseCapacity: warehouseCapacity !== null && warehouseCapacity !== '' ? parseInt(warehouseCapacity) : null,
      warehouseContact: warehouseContact || null,
      racks: validatedRacks,
      updatedAt: new Date(),
      users: users || []

    };

    console.log("Update data prepared:", updateData);

    
    const result = await db.collection("Projects").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Project not found or no changes made" },
        { status: 404 }
      );
    }

    
    if (warehouseManager && warehouseManager.trim() !== '') {
      try {
        await ProjectUserAssignmentService.assignWarehouseManager(id, warehouseManager);
      } catch (assignmentError) {
        console.error("Error updating warehouse manager assignment:", assignmentError);
        
      }
    }

    return NextResponse.json({ success: true, message: "Project updated successfully" });

  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update project", error: error.message },
      { status: 500 }
    );
  }
}


export async function DELETE(request, { params }) {
  try {
    const { db } = await connectToDatabase();
    
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid project ID" },
        { status: 400 }
      );
    }

    
    const project = await db.collection("Projects").findOne({ _id: new ObjectId(id) });
    
    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 }
      );
    }
    
    
    const projectSummary = {
      _id: project._id,
      projectName: project.projectName,
      projectId: project.projectId
    };
    
    
    const rackIds = [];
    if (project.racks && project.racks.length > 0) {
      
      rackIds.push(...project.racks.map(rackId => 
        typeof rackId === 'string' ? new ObjectId(rackId) : rackId
      ));
    }
    
    
    await db.collection("products").updateMany(
      { includedProjects: new ObjectId(id) }, 
      { $pull: { includedProjects: new ObjectId(id) } }
    );
    
    
    const result = await db.collection("Projects").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Failed to delete project" },
        { status: 500 }
      );
    }
    
    
    let deletedRacksCount = 0;
    if (rackIds.length > 0) {
      const rackDeleteResult = await db.collection("racks").deleteMany({ 
        _id: { $in: rackIds }
      });
      deletedRacksCount = rackDeleteResult.deletedCount;
    }
    
    
    await db.collection("users").updateMany(
      { assignedProject: new ObjectId(id) }, 
      { $unset: { assignedProject: "" } }
    );
    
    await db.collection("users").updateMany(
      { availableProjects: new ObjectId(id) }, 
      { $pull: { availableProjects: new ObjectId(id) } }
    );
    
    await db.collection("users").updateMany(
      { projects: new ObjectId(id) }, 
      { $pull: { projects: new ObjectId(id) } }
    );

    return NextResponse.json({
      success: true,
      message: `Project deleted successfully along with ${deletedRacksCount} associated racks`,
      deletedProject: projectSummary
    });

  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete project", error: error.message },
      { status: 500 }
    );
  }
}
