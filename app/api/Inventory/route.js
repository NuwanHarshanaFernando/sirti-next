import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(req) {
  try {
    const { db } = await connectToDatabase();

    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit; 
    const search = searchParams.get("search")?.trim() || "";
    const categories = searchParams.get("categories")?.trim() || "";
    const category = searchParams.get("category")?.trim() || ""; 
    const project = searchParams.get("project")?.trim() || "";
    const stockFilter = searchParams.get("stock")?.trim() || "";

    
    const allProjects = await db.collection("Projects").find({}).toArray();
    const projectMap = {};
    allProjects.forEach((proj) => {
      projectMap[proj._id.toString()] = proj.projectName;
    });

    
    const query = {};
    if (search) {
      
      query.$or = [
        { productName: { $regex: search, $options: "i" } },
        { productId: { $regex: search, $options: "i" } },
        { productSKU: { $regex: search, $options: "i" } },
        { serialNo: { $regex: search, $options: "i" } },
        { serialNumber: { $regex: search, $options: "i" } },
      ];
    }

    
    if (categories) {
      const categoryList = categories
        .split(",")
        .map((cat) => cat.trim())
        .filter((cat) => cat);
      if (categoryList.length > 0) {
        query.category = { $in: categoryList };
      }
    } else if (category) {
      
      query.category = category;
    }

    
    if (project) {
      const targetProject = allProjects.find((p) => p.projectName === project);
      if (targetProject) {
        query.includedProjects = targetProject._id;
        console.log(
          ` Added project filter to MongoDB query: ${project} (${targetProject._id})`
        );
      } else {
        console.log(` Project "${project}" not found in available projects`);
      }
    }

    
    const totalCount = await db.collection("products").countDocuments(query);
    const products = await db
      .collection("products")
      .find(query)
      .skip(skip)
      .limit(limit)
      .toArray();
    let enrichedProducts = [];
    for (const product of products) {
      
      const racksWithProduct = await db
        .collection("racks")
        .find({
          "products.product": new ObjectId(product._id),
        })
        .toArray();

      
      const rackIds = racksWithProduct.map((rack) => rack._id);
      const projects = await db
        .collection("Projects")
        .find({
          racks: { $in: rackIds },
        })
        .toArray();

      
      const rackStocks = [];
      const projectsWithRealStock = [];

      for (const rack of racksWithProduct) {
        
        const productInRack = rack.products.find(
          (p) => p.product.toString() === product._id.toString()
        );

        if (productInRack && productInRack.stock > 0) {
          rackStocks.push({
            rackNumber: rack.rackNumber,
            stock: productInRack.stock,
          });

          
          const projectForRack = projects.find(
            (project) =>
              project.racks &&
              project.racks.some(
                (rackId) => rackId.toString() === rack._id.toString()
              )
          );

          if (projectForRack) {
            
            const existingProject = projectsWithRealStock.find(
              (p) => p.projectId.toString() === projectForRack._id.toString()
            );

            if (existingProject) {
              
              existingProject.stocks += productInRack.stock;
            } else {
              
              projectsWithRealStock.push({
                projectId: projectForRack._id,
                projectName: projectForRack.projectName,
                color: projectForRack.color,
                stocks: productInRack.stock,
              });
            }
          }
        }
      }
      
      let finalProjectsWithStock = [];
      if (projectsWithRealStock.length > 0) {
        finalProjectsWithStock = projectsWithRealStock;
      } else {
        finalProjectsWithStock = projects.map((project) => {
          const productInProject = Array.isArray(project.products)
            ? project.products.find(
                (p) => p.productObjId.toString() === product._id.toString()
              )
            : undefined;
          return {
            projectId: project._id,
            projectName: project.projectName,
            color: project.color,
            stocks: productInProject?.stocks || 0,
          };
        });
      }

      
      const pendingTransfers = await db
        .collection("transfers")
        .find({
          productId: new ObjectId(product._id),
          status: "pending",
        })
        .toArray();
      enrichedProducts.push({
        _id: product._id,
        productId: product.productId,
        productName: product.productName || product.name,
        productSKU: product.productSKU,
        productImage: product.productImage, 
        serialNumber: product.serialNumber || product.serialNo,
        totalStock: rackStocks.reduce(
          (sum, rack) => sum + (rack.stock || 0),
          0
        ),
        projectStocks: finalProjectsWithStock,
        rackStocks: rackStocks,
        pendingTransfers: pendingTransfers.length,
        unit: product.unit,
        category: product.category,
        includedProjects: product.includedProjects || [], 
        lowStockThreshold: product.threshold || 0, 
      });
    }

    
    if (stockFilter === "in_stock") {
      enrichedProducts = enrichedProducts.filter((item) => item.totalStock > 0);
    } else if (stockFilter === "out_of_stock") {
      enrichedProducts = enrichedProducts.filter(
        (item) => item.totalStock === 0
      );
    } else if (stockFilter === "low_stock") {
      enrichedProducts = enrichedProducts.filter((item) => {
        const threshold = item.lowStockThreshold || 0;
        const totalStock = item.totalStock || 0;
        return totalStock > 0 && totalStock < threshold;
      });
    }

    
    const filteredCount = enrichedProducts.length;
    return NextResponse.json({
      inventory: enrichedProducts,
      count: filteredCount,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      success: true,
    });
  } catch (error) {
    console.error("Inventory API error:", error);
    return NextResponse.json(
      {
        error: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}
