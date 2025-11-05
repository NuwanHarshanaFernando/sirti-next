import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";


export async function GET() {
  return NextResponse.json({ 
    message: "Generate code API is working",
    timestamp: new Date().toISOString()
  });
}

export async function POST() {
  try {
    const { db } = await connectToDatabase();
    
    
    const generateCode = (length = 8) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    
    
    const isCodeUnique = async (code) => {
      const existingProduct = await db.collection("products").findOne({ 
        $or: [
          { code: code },
          { productCode: code },
          { sku: code },
          { productId: code }
        ]
      });
      return !existingProduct;
    };
    
    
    let uniqueCode;
    let attempts = 0;
    const maxAttempts = 50;
    
    
    do {
      uniqueCode = generateCode();
      attempts++;
      
      if (attempts >= maxAttempts) {
        
        uniqueCode = generateCode(10);
      }
    } while (!(await isCodeUnique(uniqueCode)) && attempts < maxAttempts * 2);
    
    if (attempts >= maxAttempts * 2) {
      console.error("Failed to generate unique code after maximum attempts");
      return NextResponse.json(
        { error: "Unable to generate unique code after multiple attempts" },
        { status: 500 }
      );
    }
    
    
    return NextResponse.json({ 
      code: uniqueCode,
      message: "Unique product code generated successfully",
      attempts: attempts
    });
    
  } catch (error) {
    console.error("Error generating unique product code:", error);
    return NextResponse.json(
      { error: "Failed to generate unique product code", details: error.message },
      { status: 500 }
    );
  }
}
