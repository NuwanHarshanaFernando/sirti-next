import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(req) {
  try {
    const { db } = await connectToDatabase();
    
    
    const products = await db.collection("products").find({}).limit(5).toArray();
    
    
    const projects = await db.collection("Projects").find({}).toArray();
    
    
    const projectMap = {};
    projects.forEach(proj => {
      projectMap[proj._id.toString()] = proj.projectName;
    });
    
    const debug = {
      totalProducts: await db.collection("products").countDocuments(),
      totalProjects: projects.length,
      projects: projects.map(p => ({ _id: p._id.toString(), name: p.projectName })),
      sampleProducts: products.map(p => ({
        _id: p._id.toString(),
        productId: p.productId,
        productName: p.productName,
        includedProjects: p.includedProjects || [],
        mappedIncludedProjects: (p.includedProjects || []).map(id => ({
          id: id.toString(),
          name: projectMap[id.toString()] || 'Unknown'
        }))
      })),
      hasProductsWithSafety: products.some(p => 
        (p.includedProjects || []).some(id => projectMap[id.toString()] === 'Safety')
      )
    };
    
    return NextResponse.json(debug);
  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
