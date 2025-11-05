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

    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Valid transaction ID is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    
    const transaction = await StockTransactionModel.findById(id)
      .populate('items.product')
      .populate('createdBy')
      .populate('project')
      .populate('requestedBy')
      .populate('approvedBy')
      .populate('receivedBy')
      .lean();

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    
    const formattedTransaction = {
      ...transaction,
      createdAt: transaction.createdAt ? transaction.createdAt.toISOString() : null,
      updatedAt: transaction.updatedAt ? transaction.updatedAt.toISOString() : null,
      completedAt: transaction.completedAt ? transaction.completedAt.toISOString() : null,
      approvedAt: transaction.approvedAt ? transaction.approvedAt.toISOString() : null,
    };

    return NextResponse.json(formattedTransaction);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching transaction details" },
      { status: 500 }
    );
  }
}
