import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateStockManagementPDFBuffer } from "@/lib/pdf-generator";

export async function POST(req, { params }) {
  return await handlePDFDownload(req, { params });
}

export async function GET(req, { params }) {
  return await handlePDFDownload(req, { params });
}

async function handlePDFDownload(req, { params }) {
  try {
    
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !["keeper", "admin", "manager"].includes(session.user.role)
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Only keepers, managers, and admins can download PDFs.",
        },
        { status: 403 }
      );
    }

    const { id } = params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Valid transaction ID is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    
    const transaction = await db
      .collection("stocktransactions")
      .findOne({ _id: new ObjectId(id) });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }


    
    let itemsWithDetails = [];

    if (
      transaction.items &&
      Array.isArray(transaction.items) &&
      transaction.items.length > 0
    ) {
      
      const productIds = transaction.items.map((item) => {
        if (typeof item.productId === "object") {
          return item.productId._id || item.productId;
        }
        return new ObjectId(item.productId);
      });

      const products = await db
        .collection("products")
        .find({ _id: { $in: productIds } })
        .toArray();

      
      itemsWithDetails = transaction.items.map((item) => {
        const productId =
          typeof item.productId === "object"
            ? item.productId._id
            : item.productId
        const product = products.find(
          (p) => p._id.toString() === productId.toString()
        );

        return {
          ...item,
          product: product || { productName: "Unknown Product" },
          productName:
            product?.productName || item.productName || "Unknown Product",
          projectName: item.projectName || "Unknown Project",
          quantity: item.quantity || 0,
          sku: product?.productId || "N/A"
        };
      });
    } else {
      
      let product = null;
      if (transaction.productId) {
        const productId =
          typeof transaction.productId === "object"
            ? transaction.productId._id || transaction.productId
            : new ObjectId(transaction.productId);

        product = await db.collection("products").findOne({ _id: productId });
      }

      itemsWithDetails = [
        {
          product: product || { productName: "Unknown Product" },
          productName:
            product?.productName ||
            transaction.productName ||
            "Unknown Product",
          projectName: transaction.projectName || "Unknown Project",
          quantity: transaction.quantity || 0,
        },
      ];
    }

    
    let project = null;
    const projectId = transaction.projectId || transaction.project;
    if (projectId) {
      const projectObjId =
        typeof projectId === "object"
          ? projectId._id || projectId
          : new ObjectId(projectId);

      project = await db.collection("Projects").findOne({ _id: projectObjId });
    } 

        let createdByName = "System";
    if (transaction.createdBy) {
      try {
        const userId =
          typeof transaction.createdBy === "object"
            ? transaction.createdBy._id || transaction.createdBy
            : new ObjectId(transaction.createdBy);

        const user = await db.collection("users").findOne({ _id: userId });
        if (user && user.name) {
          createdByName = user.name;
        } else if (user && user.email) {
          createdByName = user.email;
        }
      } catch (e) {
        
        createdByName = transaction.createdBy?.toString() || "System";
      }
    }

    const pdfData = {
      type: transaction.type || "out",
      transactionId: transaction.transactionId.toString(),
      invoiceNumber:
        transaction.invoiceNumber || transaction.transactionId || `TXN-${id}`,
      supplierName: transaction.supplierName || "N/A",
      date: transaction.date || transaction.createdAt || new Date(),
      items: itemsWithDetails,
      createdBy: createdByName,
      projectName: transaction.projectName || "N/A", 
      message: transaction.message || "",
    };

    console.log(transaction)

     
    const { pdfBuffer, pdfBlob, pdfDataUri, filename } =
      await generateStockManagementPDFBuffer(pdfData);

    
    const cleanFilename = `order-${id}.pdf`;

    
    
    const { searchParams } = new URL(req.url);
    const displayMode = searchParams.get("display");
    const contentDisposition =
      displayMode === "inline" ? "inline" : "attachment";

    
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${contentDisposition}; filename="${cleanFilename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "An error occurred while generating the PDF" },
      { status: 500 }
    );
  }
}
