import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { db } = await connectToDatabase();
      
    const managers = await db
      .collection("users")
      .find(
        { role: { $in: ["manager", "admin"] } },
        { projection: { _id: 1, name: 1, role: 1 } }
      )
      .toArray();

    
    const managerOptions = managers.map(manager => ({
      value: manager._id.toString(),
      label: manager.name || `User ${manager._id.toString().slice(-4)}`,
      role: manager.role
    }));

    return NextResponse.json({ managers: managerOptions });
  } catch (error) {
    console.error("Error fetching managers:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
