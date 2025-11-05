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

    const { db } = await connectToDatabase();

    let query = {};
    
    if (productId) {
      query.productId = new ObjectId(productId);
    }

    
    const adminActions = await db
      .collection("adminActions")
      .find(query)
      .sort({ timestamp: -1 })
      .limit(50) 
      .toArray();

    return NextResponse.json({
      success: true,
      actions: adminActions,
      count: adminActions.length,
    });
  } catch (error) {
    console.error("Error fetching admin actions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
