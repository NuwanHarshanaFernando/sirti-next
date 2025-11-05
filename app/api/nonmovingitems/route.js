import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req) {
    const { db } = await connectToDatabase();

    
    const products = await db.collection("products").find({}, { projection: { _id: 1, productId: 1, productName: 1 ,updatedAt:1} }).toArray();

    
    const outTxProductObjectIds = await db.collection("stocktransactions").distinct("productId", { type: "out" });

    
    const nonMovingProducts = products.filter(p => !outTxProductObjectIds.some(id => id.equals(p._id)));
    console.log("Non-moving products:", nonMovingProducts);
    return Response.json({ nonMovingItems: nonMovingProducts });
}