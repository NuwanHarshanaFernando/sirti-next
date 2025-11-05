import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(req, { params }) {
  try {
    const { id } = params;
    const { db } = await connectToDatabase();
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid transaction ID" },
        { status: 400 }
      );
    }
    
    const transaction = await db.collection("stocktransactions").findOne({
      _id: new ObjectId(id)
    });
    
    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
    
    
    if (transaction.createdBy) {
      let user = null;
      
      
      if (ObjectId.isValid(transaction.createdBy)) {
        user = await db.collection("users").findOne({
          _id: new ObjectId(transaction.createdBy)
        }, { projection: { name: 1, email: 1 } });
      }
      
      
      if (!user) {
        user = await db.collection("users").findOne({
          email: transaction.createdBy
        }, { projection: { name: 1, email: 1 } });
      }
      
      
      if (user) {
        transaction.createdByName = user.name || user.email || 'Unknown User';
      } else {
        transaction.createdByName = transaction.createdBy || 'Unknown User';
      }
    }
    
    return NextResponse.json({ transaction });
    
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
