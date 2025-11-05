import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    const { db } = await connectToDatabase();

    const body = await request.json();
    const { projectId, racks } = body;

    
    if (!projectId || !racks || !Array.isArray(racks) || racks.length === 0) {
      return NextResponse.json(
        { success: false, message: "Project ID and racks array are required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, message: "Invalid project ID" },
        { status: 400 }
      );
    }

    
    const project = await db
      .collection("Projects")
      .findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      return NextResponse.json(
        { success: false, message: "Project not found" },
        { status: 404 }
      );
    }

    const createdRacks = [];
    const existingRackNumbers = await db
      .collection("racks")
      .find({}, { projection: { rackNumber: 1 } })
      .toArray();
    const existingNumbers = existingRackNumbers.map((rack) => rack.rackNumber);

    
    for (const rackData of racks) {
      const { rackNumber, location, capacity } = rackData;

      
      if (!rackNumber || !location) {
        return NextResponse.json(
          {
            success: false,
            message: "Rack number and location are required for all racks",
          },
          { status: 400 }
        );
      }

      
      if (existingNumbers.includes(rackNumber)) {
        return NextResponse.json(
          {
            success: false,
            message: `Rack number ${rackNumber} already exists`,
          },
          { status: 400 }
        );
      }

      
      const newRack = {
        rackNumber,
        location,
        capacity: capacity || 100,
        projectId: new ObjectId(projectId),
        inventory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("racks").insertOne(newRack);
      const savedRack = { ...newRack, _id: result.insertedId };
      createdRacks.push(savedRack);
      existingNumbers.push(rackNumber); 
    }

    
    const rackIds = createdRacks.map((rack) => rack._id);
    await db.collection("Projects").updateOne(
      { _id: new ObjectId(projectId) },
      {
        $addToSet: {
          racks: { $each: rackIds },
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `${createdRacks.length} racks added successfully`,
      racks: createdRacks,
    });
  } catch (error) {
    console.error("Error adding racks:", error);
    return NextResponse.json(
      { success: false, message: "Failed to add racks" },
      { status: 500 }
    );
  }
}
