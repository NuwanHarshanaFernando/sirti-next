import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(req) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }
    const product = await db.collection("products").findOne({ _id: new ObjectId(productId) });
    if (!product || !Array.isArray(product.includedProjects)) {
      return NextResponse.json({ projects: [] });
    }
    const projects = await db.collection("Projects").find({
      _id: { $in: product.includedProjects.map(id => new ObjectId(id)) }
    }, { projection: { _id: 1, projectName: 1 } }).toArray();
    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}