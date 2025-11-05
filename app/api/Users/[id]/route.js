import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    const { db } = await connectToDatabase();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await db
      .collection("users")
      .aggregate([
        {
          $match: { _id: new ObjectId(id) }
        },
        {
          $lookup: {
            from: "Projects",
            localField: "availaleProjects", 
            foreignField: "_id",
            as: "availableProjects", 
          },
        },
        {
          $project: {
            name: 1,
            email: 1,
            contact: 1,
            accessCode: 1,
            role: 1,
            availaleProjects: 1, 
            availableProjects: { 
              _id: 1,
              projectName: 1,
              color: 1,
            },
          },
        },
      ])
      .toArray();

    if (user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: user[0] });
  } catch (error) {
    console.log("error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
