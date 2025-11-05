import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req) {
  try {
    const { db } = await connectToDatabase();
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');
    
    let query = {};
  if (projectId) {
      
      if (projectId === 'EXTERNAL') {
        return NextResponse.json({ racks: [] });
      }
      let project;
      try {
        project = await db.collection("Projects").findOne({
          _id: new ObjectId(projectId)
        });
      } catch (e) {
        console.warn('Invalid projectId for racks API:', projectId);
        return NextResponse.json({ racks: [] });
      }
      if (project && project.racks) {
        query = { _id: { $in: project.racks } };
      } else {
        
        query = { projectId: projectId };
      }
    }

    
    let racks = await db
      .collection("racks")
      .find(query)
      .toArray();
      
    if (racks.length === 0) {
      racks = await db
        .collection("Racks")
        .find(query)
        .toArray();
    }

  if ((!racks || racks.length === 0) && projectId) {
      try {
        const session = await getServerSession(authOptions);
        const email = session?.user?.email;
    if (email) {
          const { db } = await connectToDatabase();
          const user = await db.collection('users').findOne({ email });
          if (user) {
            // Find manager's Lobby project and its rack
            const lobby = await db.collection('Projects').findOne({ isLobby: true, lobbyOwner: user._id });
            if (lobby && Array.isArray(lobby.racks) && lobby.racks.length > 0) {
              const lobbyRacks = await db.collection('racks').find({ _id: { $in: lobby.racks } }).toArray();
              if (lobbyRacks.length > 0) {
                return NextResponse.json({ racks: lobbyRacks });
              }
            }
          }
        }
      } catch (e) {
      }
    }

    return NextResponse.json({ racks });
  } catch (error) {
    console.error("Error fetching racks:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    
    const { rackNumber, projectId, inventoryId } = body;

    
    if (!rackNumber || !projectId) {
      return NextResponse.json(
        { error: "Rack number and project ID are required" },
        { status: 400 }
      );
    }

    
    const existingRack = await db.collection("racks").findOne({
      rackNumber: { $regex: new RegExp(`^${rackNumber}$`, 'i') }
    });

    if (existingRack) {
      return NextResponse.json(
        { error: "Rack number already exists" },
        { status: 400 }
      );
    }

    
    const newRack = {
      rackNumber,
      inventory: inventoryId ? new ObjectId(inventoryId) : null,
      products: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("racks").insertOne(newRack);

    if (result.insertedId) {
      
      await db.collection("Projects").updateOne(
        { _id: new ObjectId(projectId) },
        { $addToSet: { racks: result.insertedId } }
      );

      return NextResponse.json(
        { 
          message: "Rack created successfully",
          rackId: result.insertedId,
          rack: { ...newRack, _id: result.insertedId }
        },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { error: "Failed to create rack" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error creating rack:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();
    
    const { rackId, projectId } = body;

    if (!rackId || !projectId) {
      return NextResponse.json(
        { error: "Rack ID and project ID are required" },
        { status: 400 }
      );
    }

    
    const deleteResult = await db.collection("racks").deleteOne({
      _id: new ObjectId(rackId)
    });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { error: "Rack not found" },
        { status: 404 }
      );
    }

    
    await db.collection("Projects").updateOne(
      { _id: new ObjectId(projectId) },
      { $pull: { racks: new ObjectId(rackId) } }
    );

    return NextResponse.json(
      { message: "Rack deleted successfully" },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error deleting rack:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}