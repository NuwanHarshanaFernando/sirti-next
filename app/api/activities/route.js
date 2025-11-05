import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";


export async function GET(req) {
  try {
    const { db } = await connectToDatabase();

    
    const activities = await db
      .collection("activities")
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

    return NextResponse.json({
      activities,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function POST(req) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    const {
      type,
      action,
      entityType,
      entityId,
      entityName,
      userId,
      userEmail,
      userName,
      changes,
      projectId,
      projectName,
      metadata
    } = body;

    
    if (!type || !action || !entityType) {
      return NextResponse.json(
        { error: "Missing required fields: type, action, entityType" },
        { status: 400 }
      );
    }

    const activity = {
      type,
      action,
      entityType,
      entityId: entityId ? new ObjectId(entityId) : null,
      entityName: entityName || 'Unknown Entity',
      userId: userId ? new ObjectId(userId) : null,
      userEmail,
      userName: userName || 'Unknown User',
      changes: changes || {},
      projectId: projectId ? new ObjectId(projectId) : null,
      projectName,
      metadata: metadata || {},
      timestamp: new Date(),
      createdAt: new Date()
    };

    const result = await db.collection("activities").insertOne(activity);

    return NextResponse.json({
      message: "Activity logged successfully",
      activityId: result.insertedId,
      success: true,
    });
  } catch (error) {
    console.error("Error logging activity:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
