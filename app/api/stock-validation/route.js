import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ObjectId } from "mongodb";

export async function GET(req) {
  try {
    
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const projectId = searchParams.get("projectId");
    const getAllProjects = searchParams.get("getAllProjects") === "true";
    const forDestination = searchParams.get("forDestination") === "true";

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    if (!getAllProjects && !projectId) {
      return NextResponse.json(
        { error: "Project ID is required when not fetching all projects" },
        { status: 400 }
      );
    }

    if (getAllProjects) {
      
      const projects = await db.collection("Projects").find({}).toArray();
      
      
      const racksWithProduct = await db
        .collection("racks")
        .find({
          "products.product": new ObjectId(productId),
        })
        .toArray();

      const allProjectsData = [];
      
      for (const project of projects) {
        const rackBreakdown = [];
        let availableStock = 0;
        
        for (const rack of racksWithProduct) {
          
          const rackBelongsToProject =
            project.racks &&
            project.racks.some(
              (rackId) => rackId.toString() === rack._id.toString()
            );

          if (rackBelongsToProject) {
            const productInRack = rack.products.find(
              (p) => p.product.toString() === productId
            );

            if (productInRack && productInRack.stock > 0) {
              availableStock += productInRack.stock;
              rackBreakdown.push({
                rackNumber: rack.rackNumber,
                stock: productInRack.stock,
              });
            }
          }
        }
        
        
        if (availableStock > 0) {
          allProjectsData.push({
            projectId: project._id,
            projectName: project.projectName,
            availableStock,
            rackBreakdown
          });
        }
      }
      
      const result = {
        allProjectsData,
        success: true,
      };
      
      return NextResponse.json(result);
    } else {
      
      
      const project = await db.collection("Projects").findOne({
        _id: new ObjectId(projectId),
      });

      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }

      
      const racksWithProduct = await db
        .collection("racks")
        .find({
          "products.product": new ObjectId(productId),
        })
        .toArray();

      let availableStock = 0;
      const rackBreakdown = [];

      
      const projectRacks = await db
        .collection("racks")
        .find({
          _id: { $in: project.racks.map(rackId => new ObjectId(rackId)) }
        })
        .toArray();

      if (forDestination) {
        
        for (const rack of projectRacks) {
          const productInRack = rack.products?.find(
            (p) => p.product.toString() === productId
          );

          rackBreakdown.push({
            rackNumber: rack.rackNumber,
            stock: productInRack?.stock || 0,
          });
        }
      } else {
        
        for (const rack of projectRacks) {
          const productInRack = rack.products?.find(
            (p) => p.product.toString() === productId
          );

          if (productInRack && productInRack.stock > 0) {
            availableStock += productInRack.stock;
            rackBreakdown.push({
              rackNumber: rack.rackNumber,
              stock: productInRack.stock,
            });
          }
        }
      }

      const result = {
        availableStock,
        rackBreakdown,
        projectName: project.projectName,
        success: true,
      };
      
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("Stock validation API error:", error);
    return NextResponse.json(
      {
        error: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}
