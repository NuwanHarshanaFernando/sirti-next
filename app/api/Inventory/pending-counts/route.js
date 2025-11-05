import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productIds = searchParams.get("productIds");

    if (!productIds) {
      return NextResponse.json({ error: "Product IDs are required" }, { status: 400 });
    }

    const productIdArray = productIds.split(",").filter(id => id.trim());
    
    if (productIdArray.length === 0) {
      return NextResponse.json({ counts: {} });
    }

    const { db } = await connectToDatabase();
    
    
    const objectIds = productIdArray.map(id => {
      try {
        return new ObjectId(id);
      } catch (error) {
        console.error(`Invalid ObjectId: ${id}`);
        return null;
      }
    }).filter(id => id !== null);

    if (objectIds.length === 0) {
      return NextResponse.json({ counts: {} });
    }

    
    const [pendingTransfers, pendingStockRequests] = await Promise.all([
      db.collection("transfers").find({
        productId: { $in: objectIds },
        status: "pending"
      }).toArray(),
      
      db.collection("stockAdjustmentRequests").find({
        productId: { $in: objectIds },
        status: "pending"
      }).toArray()
    ]);

    
    const counts = {};
    
    
    productIdArray.forEach(id => {
      counts[id] = 0;
    });

    
    pendingTransfers.forEach(transfer => {
      const productId = transfer.productId.toString();
      if (counts.hasOwnProperty(productId)) {
        counts[productId]++;
      }
    });

    
    pendingStockRequests.forEach(request => {
      const productId = request.productId.toString();
      if (counts.hasOwnProperty(productId)) {
        counts[productId]++;
      }
    });

    return NextResponse.json({ counts });
  } catch (error) {
    console.error("Error fetching pending counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending counts" },
      { status: 500 }
    );
  }
}
