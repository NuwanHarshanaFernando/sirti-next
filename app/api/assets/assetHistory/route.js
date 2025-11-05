export async function DELETE(request) {
  const { db } = await connectToDatabase();
  const { assetId } = await request.json();
  if (!assetId) {
    return NextResponse.json({ error: "assetId is required" }, { status: 400 });
  }
  const result = await db.collection("AssetHistory").deleteMany({ assetId });
  return NextResponse.json({ deletedCount: result.deletedCount }, { status: 200 });
}
import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";

export async function GET(request) {
  const { db } = await connectToDatabase();
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("id");
  let query = {};
  if (assetId) {
    query.assetId = assetId;
  }
  const history = await db.collection("AssetHistory").find(query).toArray();
  return NextResponse.json(history, { status: 200 });
}

export async function POST(request) {
  const { db } = await connectToDatabase();
  const data = await request.json();
  
  const result = await db.collection("AssetHistory").insertOne(data);
  return NextResponse.json(result.ops?.[0] || data, { status: 201 });
}