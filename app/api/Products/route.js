import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET(req) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit")) || 0;

    
    let filter = {};
    if (search) {
      filter = {
        $or: [
          { productName: { $regex: search, $options: "i" } },
          { code: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { serialNo: { $regex: search, $options: "i" } },
          { serialNumber: { $regex: search, $options: "i" } }
        ]
      };
    }

    console.log('Search query:', search);
    console.log('Filter applied:', filter);
    
    const query = db.collection("products").find(filter);
    if (limit > 0) {
      query.limit(limit);
    }
    const products = await query.toArray();
    console.log('Products found:', products.length);
    for (const product of products) {
      console.log('Product serialNo:', product.serialNo, 'serialNumber:', product.serialNumber);
    }
    
    const enrichedProducts = [];

    for (const product of products) {
      
      const createdByUser = await db
        .collection("users")
        .findOne({ _id: product.createdBy }, { projection: { name: 1 } });

      
      let populatedIncludedProjects = [];
      if (product.includedProjects && Array.isArray(product.includedProjects) && product.includedProjects.length > 0) {
        // includedProjects are now stored as ObjectIds, so we can use them directly
        populatedIncludedProjects = await db
          .collection("Projects")
          .find({ _id: { $in: product.includedProjects } })
          .project({ _id: 1, projectName: 1, name: 1, description: 1 })
          .toArray();
      }

      
      const racksWithProduct = await db
        .collection("racks")
        .find({
          "products.product": new ObjectId(product._id),
        })
        .toArray();

      
      const rackIds = racksWithProduct.map(rack => rack._id);
      const projects = await db
        .collection("Projects")
        .find({
          racks: { $in: rackIds }
        })
        .toArray();

      let totalStocks = 0;
      const projectsWithRealStock = [];

      
      for (const rack of racksWithProduct) {
        const productInRack = rack.products.find(
          (p) => p.product.toString() === product._id.toString()
        );

        if (productInRack && productInRack.stock > 0) {
          totalStocks += productInRack.stock;

          
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
      let finalProjects = [];
      
      if (projectsWithRealStock.length > 0) {
        
        finalProjects = projectsWithRealStock.map((p) => ({
          projectName: p.projectName,
          color: p.color,
          stocks: p.stocks,
        }));
      } else {
        
        const projectsWithAssignments = await db
          .collection("Projects")
          .find({
            "products.productObjId": new ObjectId(product._id),
          })
          .toArray();
          
        finalProjects = projectsWithAssignments.map((project) => {
          const productInProject = project.products.find(
            (p) => p.productObjId.toString() === product._id.toString()
          );
          return {
            projectName: project.projectName,
            color: project.color,
            stocks: productInProject?.stocks || 0,
          };
        });
      }

      
      const finalTotalStocks =
        totalStocks > 0
          ? totalStocks
          : finalProjects.reduce((sum, p) => sum + (p.stocks || 0), 0);

      enrichedProducts.push({
        _id: product._id,
        productName: product.productName,
        productId: product.productId,
        productImage: product.productImage,
        category: product.category,
        code: product.code,
        dimensions: product.dimensions,
        weight: product.weight,
        price: product.price,
        threshold: product.threshold,
        
        serialNo: product.serialNo,
        serialNumber: product.serialNumber || product.serialNo,
        unit: product.unit,
        stocks: product.stocks,
        projects: finalProjects,
        totalStocks: finalTotalStocks,
        totalStockValue: finalTotalStocks * product.price,
        createdByName: createdByUser?.name || "Unknown",
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        includedProjects: populatedIncludedProjects, 
      });
    }

    return NextResponse.json({ products: enrichedProducts });
  } catch (error) {
    console.log("error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { db } = await connectToDatabase();
    const body = await req.json();

    

    
    const duplicateChecks = [];
    if (body.productName) duplicateChecks.push({ productName: body.productName });
    if (body.productId) duplicateChecks.push({ productId: body.productId });
    if (body.code) duplicateChecks.push({ code: body.code });
    
    if (duplicateChecks.length > 0) {
      const existingProduct = await db.collection("products").findOne({
        $or: duplicateChecks,
      });

      if (existingProduct) {
        return NextResponse.json(
          {
            error: "Product with this name, product ID, or code already exists",
            success: false,
          },
          { status: 409 }
        );
      }
    }

    
    if (body.createdBy) {
      const userExists = await db.collection("users").findOne({
        _id: new ObjectId(body.createdBy),
      });

      if (!userExists) {
        return NextResponse.json(
          {
            error: "Invalid createdBy user ID",
            success: false,
          },
          { status: 400 }
        );
      }
    }

    
    const productData = {
      productId: body.productId || null,
      productName: body.productName || null,
      price: body.price ? Number(body.price) : null,
      category: body.category || null,
      code: body.code || null,
      dimensions: body.dimensions || null,
      weight: body.weight ? Number(body.weight) : null,
      threshold: body.threshold ? Number(body.threshold) : null,
      
      serialNo: body.serialNo || null, 
      serialNumber: body.serialNumber || body.serialNo || null, 
      unit: body.unit || null, 
      productImage: body.productImage || null, 
      includedProjects: body.includedProjects && Array.isArray(body.includedProjects) 
        ? body.includedProjects.map(id => new ObjectId(id)) 
        : [], 
      createdBy: body.createdBy ? new ObjectId(body.createdBy) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }; 
    console.log("productData", productData);
    const result = await db.collection("products").insertOne(productData);

    if (result.insertedId) {
      
      if (body.projectsInfo && Array.isArray(body.projectsInfo)) {
        const projectUpdates = [];
        const rackUpdates = [];

        for (const projectInfo of body.projectsInfo) {
          
          if (
            projectInfo.adjustStock > 0 ||
            (projectInfo.racks && projectInfo.racks.length > 0)
          ) {
            
            if (projectInfo.adjustStock > 0) {
              const projectUpdateOperation = {
                updateOne: {
                  filter: { _id: new ObjectId(projectInfo.projectId) },
                  update: {
                    $addToSet: {
                      products: {
                        productObjId: result.insertedId,
                        stocks: Number(projectInfo.adjustStock),
                      },
                    },
                    $set: { updatedAt: new Date() },
                  },
                },
              };
              projectUpdates.push(projectUpdateOperation);
            }

            
            if (projectInfo.racks && projectInfo.racks.length > 0) {
              for (const rackNumber of projectInfo.racks) {
                const rackUpdateOperation = {
                  updateOne: {
                    filter: { rackNumber: rackNumber },
                    update: {
                      $addToSet: {
                        products: {
                          product: result.insertedId,
                          stock: Number(projectInfo.adjustStock) || 0,
                        },
                      },
                      $set: { updatedAt: new Date() },
                    },
                    upsert: true, 
                  },
                };
                rackUpdates.push(rackUpdateOperation);
              }
            }
          }
        }

        
        if (projectUpdates.length > 0) {
          await db.collection("Projects").bulkWrite(projectUpdates);
        }
        
        if (rackUpdates.length > 0) {
          await db.collection("racks").bulkWrite(rackUpdates);
        }
      }
      
      const createdProduct = await db
        .collection("products")
        .aggregate([
          { $match: { _id: result.insertedId } },
          {
            $lookup: {
              from: "users",
              let: { createdById: "$createdBy" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$_id", "$$createdById"] },
                  },
                },
                {
                  $project: { name: 1, _id: 0 },
                },
              ],
              as: "createdByUser",
            },
          },
          {
            $addFields: {
              createdByName: { $arrayElemAt: ["$createdByUser.name", 0] },
            },
          },
          {
            $project: {
              createdByUser: 0,
            },
          },
        ])
        .toArray();

      
      const projectAssignments = body.projectsInfo
        ? body.projectsInfo
            .filter((p) => p.adjustStock > 0 || (p.racks && p.racks.length > 0))
            .map((p) => ({
              projectName: p.projectName,
              stockAssigned: p.adjustStock,
              racksAssigned: p.racks || [],
            }))
        : [];

      return NextResponse.json(
        {
          message: "Product created successfully",
          product: createdProduct[0],
          projectAssignments: projectAssignments,
          success: true,
        },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        {
          error: "Failed to create product",
          success: false,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Product creation error:", error);
    return NextResponse.json(
      {
        error: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("id");

    if (!productId) {
      return NextResponse.json(
        {
          error: "Product ID is required",
          success: false,
        },
        { status: 400 }
      );
    }

    
    if (!ObjectId.isValid(productId)) {
      return NextResponse.json(
        {
          error: "Invalid product ID format",
          success: false,
        },
        { status: 400 }
      );
    }

    
    const existingProduct = await db.collection("products").findOne({
      _id: new ObjectId(productId),
    });

    if (!existingProduct) {
      return NextResponse.json(
        {
          error: "Product not found",
          success: false,
        },
        { status: 404 }
      );
    }

    
    const productInProjects = await db.collection("Projects").findOne({
      "products.productObjId": new ObjectId(productId),
    });

    if (productInProjects) {
      return NextResponse.json(
        {
          error:
            "Cannot delete product: it is currently used in one or more projects",
          success: false,
        },
        { status: 409 }
      );
    }

    
    const result = await db.collection("products").deleteOne({
      _id: new ObjectId(productId),
    });

    if (result.deletedCount === 1) {
      return NextResponse.json(
        {
          message: "Product deleted successfully",
          success: true,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          error: "Failed to delete product",
          success: false,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Product deletion error:", error);
    return NextResponse.json(
      {
        error: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}
