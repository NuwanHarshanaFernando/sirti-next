import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(req) {
  try {
    const { db } = await connectToDatabase();
    
    
    const projects = await db.collection("Projects").find({}).toArray();
    
    
    const projectMap = {};
    projects.forEach(proj => {
      projectMap[proj._id.toString()] = proj.projectName;
    });
    
    
    const products = await db.collection("products").find({}).toArray();
    
    
    const projectCounts = {};
    const projectProducts = {};
    
    projects.forEach(proj => {
      projectCounts[proj.projectName] = 0;
      projectProducts[proj.projectName] = [];
    });
    
    products.forEach(product => {
      if (product.includedProjects && Array.isArray(product.includedProjects)) {
        product.includedProjects.forEach(projId => {
          const projectName = projectMap[projId.toString()];
          if (projectName) {
            projectCounts[projectName]++;
            projectProducts[projectName].push({
              id: product.productId,
              name: product.productName
            });
          }
        });
      }
    });
    
    
    const sampleProducts = products.slice(0, 10).map(p => ({
      productId: p.productId,
      productName: p.productName,
      includedProjects: p.includedProjects || [],
      mappedProjects: (p.includedProjects || []).map(id => projectMap[id.toString()]).filter(Boolean)
    }));
    
    const debug = {
      totalProducts: products.length,
      totalProjects: projects.length,
      projectCounts,
      projectProducts: Object.fromEntries(
        Object.entries(projectProducts).map(([name, prods]) => [
          name, 
          { count: prods.length, sample: prods.slice(0, 3) }
        ])
      ),
      sampleProducts,
      projects: projects.map(p => ({ 
        _id: p._id.toString(), 
        name: p.projectName 
      }))
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
