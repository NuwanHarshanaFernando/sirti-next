
import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";


export async function GET(req, { params }) {
  try {
    const { db } = await connectToDatabase();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    
    const product = await db
      .collection("products")
      .findOne({ _id: new ObjectId(id) });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }    
    const createdByUser = await db
      .collection("users")
      .findOne({ _id: product.createdBy }, { projection: { name: 1 } });

    
    const racksWithProduct = await db
      .collection("racks")
      .find({
        "products.product": new ObjectId(id),
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
        (p) => p.product.toString() === id
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
              _id: projectForRack._id,
            });
          }
        }
      }
    }    
    let finalProjects = [];
    
    if (projectsWithRealStock.length > 0) {
      
      finalProjects = projectsWithRealStock;
    } else {
      
      const projectsWithAssignments = await db
        .collection("Projects")
        .find({
          "products.productObjId": new ObjectId(id),
        })
        .toArray();
        
      finalProjects = projectsWithAssignments.map((project) => {
        const productInProject = project.products.find(
          (p) => p.productObjId.toString() === id
        );        return {
          projectName: project.projectName,
          color: project.color,
          stocks: productInProject?.stocks || 0,
          _id: project._id,
        };
      });
    }

    
    const finalTotalStocks =
      totalStocks > 0
        ? totalStocks
        : finalProjects.reduce((sum, p) => sum + (p.stocks || 0), 0);

    const enrichedProduct = {
      ...product,
      projects: finalProjects,
      totalStocks: finalTotalStocks,
      totalStockValue: finalTotalStocks * product.price,
      createdByName: createdByUser?.name || "Unknown",
      includedProjects: product.includedProjects || [],
    };

    return NextResponse.json(enrichedProduct);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // if (session.user.role !== "admin" || session.user.role !== "keeper") {
    //   return NextResponse.json({ error: "Only admins can edit products" }, { status: 403 });
    // }
     if (session.user.role !== "admin" && session.user.role !== "keeper") {
      return NextResponse.json({ error: "Only admins and keepers can edit products" }, { status: 403 });
    }
    const { db } = await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    
    const originalProduct = await db
      .collection("products")
      .findOne({ _id: new ObjectId(id) });

    if (!originalProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const {
      productName,
      price,
      weight,
      dimensions,
      category,
      image,
      threshold,
      
  serialNo,
  serialNumber,
      unit,
      userEmail, 
      userName,
      includedProjects, 
    } = body;

    
    const updateData = {
      updatedAt: new Date(),
    };

    
    const changes = {};

    if (productName !== undefined && productName !== originalProduct.productName) {
      updateData.productName = productName;
      changes.productName = { from: originalProduct.productName, to: productName };
    }
    if (price !== undefined && parseFloat(price) !== originalProduct.price) {
      updateData.price = parseFloat(price);
      changes.price = { from: originalProduct.price, to: parseFloat(price) };
    }
    if (weight !== undefined && weight !== originalProduct.weight) {
      updateData.weight = weight;
      changes.weight = { from: originalProduct.weight, to: weight };
    }
    if (dimensions !== undefined && dimensions !== originalProduct.dimensions) {
      updateData.dimensions = dimensions;
      changes.dimensions = { from: originalProduct.dimensions, to: dimensions };
    }
    if (category !== undefined && category !== originalProduct.category) {
      updateData.category = category;
      changes.category = { from: originalProduct.category, to: category };
    }
    if (image !== undefined && image !== originalProduct.productImage) {
      updateData.productImage = image;
      changes.productImage = { from: originalProduct.productImage, to: image };
    }
    if (threshold !== undefined && parseFloat(threshold) !== originalProduct.threshold) {
      updateData.threshold = parseFloat(threshold);
      changes.threshold = { from: originalProduct.threshold, to: parseFloat(threshold) };
    }
    
    // Handle serial numbers (support both legacy serialNo and new serialNumber)
    if (serialNumber !== undefined && serialNumber !== originalProduct.serialNumber) {
      updateData.serialNumber = serialNumber;
      changes.serialNumber = { from: originalProduct.serialNumber, to: serialNumber };
      // Keep legacy field in sync if it exists
      if (originalProduct.serialNo !== serialNumber) {
        updateData.serialNo = serialNumber;
        changes.serialNo = { from: originalProduct.serialNo, to: serialNumber };
      }
    } else if (serialNo !== undefined && serialNo !== originalProduct.serialNo) {
      updateData.serialNo = serialNo;
      changes.serialNo = { from: originalProduct.serialNo, to: serialNo };
      if (originalProduct.serialNumber !== serialNo) {
        updateData.serialNumber = serialNo;
        changes.serialNumber = { from: originalProduct.serialNumber, to: serialNo };
      }
    }
    if (unit !== undefined && unit !== originalProduct.unit) {
      updateData.unit = unit;
      changes.unit = { from: originalProduct.unit, to: unit };
    }
    
    if (includedProjects !== undefined) {
      updateData.includedProjects = includedProjects.map(id => typeof id === 'string' ? new ObjectId(id) : id);
      changes.includedProjects = { from: originalProduct.includedProjects || [], to: includedProjects };
    }

    
    if (Object.keys(changes).length === 0) {
      return NextResponse.json({
        message: "No changes detected",
        modifiedCount: 0,
      });
    }

    const result = await db
      .collection("products")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    
    if (result.modifiedCount > 0) {
      try {
        await db.collection("activities").insertOne({
          type: 'product_update',
          action: 'updated product',
          entityType: 'product',
          entityId: new ObjectId(id),
          entityName: originalProduct.productName || 'Unknown Product',
          userEmail: userEmail || 'unknown@example.com',
          userName: userName || 'Unknown User',
          changes,
          timestamp: new Date(),
          createdAt: new Date(),
          metadata: {
            changedFields: Object.keys(changes),
            totalChanges: Object.keys(changes).length
          }
        });
      } catch (activityError) {
        console.error('Error logging product update activity:', activityError);
        
      }
    }

    return NextResponse.json({
      message: "Product updated successfully",
      modifiedCount: result.modifiedCount,
      changes: Object.keys(changes),
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Only admins can delete products" }, { status: 403 });
    }
    const { db } = await connectToDatabase();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    
    const productToDelete = await db
      .collection("products")
      .findOne({ _id: new ObjectId(id) });

    if (!productToDelete) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    
    
    const projectUpdateResult = await db
      .collection("Projects")
      .updateMany(
        { "products.productObjId": new ObjectId(id) },
        { $pull: { products: { productObjId: new ObjectId(id) } } }
      );

    
    const rackUpdateResult = await db
      .collection("racks")
      .updateMany(
        { "products.product": new ObjectId(id) },
        { $pull: { products: { product: new ObjectId(id) } } }
      );

    
    const deleteResult = await db
      .collection("products")
      .deleteOne({ _id: new ObjectId(id) });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    
    try {
      
      const session = req.headers.get('x-session-data') 
        ? JSON.parse(req.headers.get('x-session-data')) 
        : null;
      
      const userEmail = session?.user?.email || 'unknown@example.com';
      const userName = session?.user?.name || 'Unknown User';
      
      await db.collection("activities").insertOne({
        action: "product_deleted",
        productId: new ObjectId(id),
        productName: productToDelete.productName || 'Unknown Product',
        productCode: productToDelete.productCode || 'Unknown Code',
        userEmail,
        userName,
        metadata: {
          projectsUpdated: projectUpdateResult.modifiedCount,
          racksUpdated: rackUpdateResult.modifiedCount
        },
        timestamp: new Date(),
        createdAt: new Date()
      });
    } catch (activityError) {
      console.error('Error logging product deletion activity:', activityError);
      
    }

    return NextResponse.json({
      message: "Product deleted successfully",
      deletedCount: deleteResult.deletedCount,
      projectsUpdated: projectUpdateResult.modifiedCount,
      racksUpdated: rackUpdateResult.modifiedCount
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
