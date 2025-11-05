import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import StockTransactionModel from "@/lib/models/StockTransactions";

export async function GET(req, { params }) {
  try {
    
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'keeper') {
      return NextResponse.json(
        { error: "Unauthorized. Only keepers can view order details." },
        { status: 403 }
      );
    }

    const { transactionId } = await params;

    if (!transactionId || !ObjectId.isValid(transactionId)) {
      return NextResponse.json(
        { error: "Valid transaction ID is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    
    const transaction = await db.collection("stocktransactions").findOne({ 
      _id: new ObjectId(transactionId) 
    });
    
    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    
    let enrichedTransaction = { ...transaction };
    
    if (transaction.items && transaction.items.length > 0) {
      
      const enrichedItems = await Promise.all(
        transaction.items.map(async (item) => {
          const [product, project, rack] = await Promise.all([
            db.collection("products").findOne({ _id: item.productId }),
            db.collection("Projects").findOne({ _id: item.projectId }),
            db.collection("racks").findOne({ _id: item.rackId })
          ]);
          
          return {
            ...item,
            productDetails: product || { productName: 'Unknown Product' },
            projectDetails: project || { projectName: 'Unknown Project' },
            rackDetails: rack || { rackNumber: 'Unknown Rack' }
          };
        })
      );
      
      enrichedTransaction.items = enrichedItems;
    } else {
      
      const [product, project, rack] = await Promise.all([
        db.collection("products").findOne({ _id: transaction.productId }),
        db.collection("Projects").findOne({ _id: transaction.projectId }),
        db.collection("racks").findOne({ _id: transaction.rackId })
      ]);
      
      enrichedTransaction.productDetails = product || { productName: 'Unknown Product' };
      enrichedTransaction.projectDetails = project || { projectName: 'Unknown Project' };
      enrichedTransaction.rackDetails = rack || { rackNumber: 'Unknown Rack' };
    }
    
    
    const createdByUser = transaction.createdBy ? 
      await db.collection("users").findOne({ _id: transaction.createdBy }) : null;

    
    enrichedTransaction._id = transaction._id.toString();
    enrichedTransaction.createdBy = transaction.createdBy ? transaction.createdBy.toString() : null;
    enrichedTransaction.createdByDetails = createdByUser ? {
      name: createdByUser.name,
      email: createdByUser.email
    } : null;

    
    if (transaction.productId) {
      enrichedTransaction.productId = transaction.productId.toString();
    }
    if (transaction.projectId) {
      enrichedTransaction.projectId = transaction.projectId.toString();
    }
    if (transaction.rackId) {
      enrichedTransaction.rackId = transaction.rackId.toString();
    }

    return NextResponse.json(enrichedTransaction);

  } catch (error) {
    console.error("Error fetching order details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
