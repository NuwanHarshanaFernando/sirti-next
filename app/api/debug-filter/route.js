import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(req) {
  try {
    const { db } = await connectToDatabase();

    
    const allProjects = await db.collection("Projects").find({}).toArray();
    const projectMap = {};
    allProjects.forEach(proj => {
      projectMap[proj._id.toString()] = proj.projectName;
    });

    
    const project61600 = allProjects.find(p => p.projectName === '61600');
    
    
    const products61600 = await db.collection("products").find({
      includedProjects: project61600._id
    }).limit(3).toArray();


    const debug_info = [];

    for (const product of products61600) {
      const info = {
        productId: product.productId,
        productName: product.productName,
        includedProjects: product.includedProjects,
        mappedProjects: product.includedProjects?.map(projId => ({
          objectId: projId.toString(),
          projectName: projectMap[projId.toString()],
          matches61600: projectMap[projId.toString()] === '61600'
        }))
      };

      debug_info.push(info);
    }

    
    const project = '61600';
    const testProduct = products61600[0];
    if (testProduct) {
      const isIncludedInProject = testProduct.includedProjects?.some(projId => {
        const projectName = projectMap[projId.toString()];
        return projectName === project;
      });

      debug_info.push({
        test_filtering: {
          project_filter: project,
          test_product: testProduct.productId,
          includedProjects: testProduct.includedProjects,
          filter_result: isIncludedInProject,
          projectMap_sample: Object.entries(projectMap).slice(0, 3)
        }
      });
    }

    return NextResponse.json({
      debug_info,
      projectMap_keys: Object.keys(projectMap),
      projectMap_values: Object.values(projectMap),
      total_projects: allProjects.length
    });

  } catch (error) {
    console.error("Debug filter API error:", error);
    return NextResponse.json(
      {
        error: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}
