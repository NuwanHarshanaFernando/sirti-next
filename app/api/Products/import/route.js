import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    const { db } = await connectToDatabase();
    const productData = await request.json();

    
    const requiredFields = ['productId', 'productName', 'category', 'unit'];
    const missingFields = requiredFields.filter(field => !productData[field] || !productData[field].toString().trim());
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    
    if (productData.qtyIn !== undefined && productData.qtyOut !== undefined && productData.qtyRemaining !== undefined) {
      const calculatedRemaining = (productData.qtyIn || 0) - (productData.qtyOut || 0);
      if (productData.qtyRemaining !== calculatedRemaining) {
        return NextResponse.json(
          { error: `QTY Remaining (${productData.qtyRemaining}) does not match calculated quantity (QTY In: ${productData.qtyIn} - QTY Out: ${productData.qtyOut} = ${calculatedRemaining})` },
          { status: 400 }
        );
      }
    }

    
    const existingProduct = await db.collection("products").findOne({
      productId: productData.productId.toString().trim()
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: `Product with SKU '${productData.productId}' already exists` },
        { status: 409 }
      );
    }

    
    const productDocument = {
      productId: productData.productId.toString().trim(),
      productName: productData.productName.toString().trim(),
      category: productData.category.toString().trim(),
      unit: productData.unit.toString().trim(),
      price: productData.price || 0,
      lowStockThreshold: productData.lowStockThreshold || 10,
      productImage: productData.productImage || '',
      weight: productData.weight || 0,
      dimensions: productData.dimensions || '',
      description: productData.description || '',
      serialNumber: productData.serialNumber?.toString().trim() || '',
      qtyIn: productData.qtyIn || 0,
      qtyOut: productData.qtyOut || 0,
      qtyRemaining: productData.qtyRemaining || 0,
      remarks: productData.remarks?.toString().trim() || '',
      includedProjects: [], 
      createdAt: new Date(),
      updatedAt: new Date()
    };

    
    const result = await db.collection("products").insertOne(productDocument);
    const productId = result.insertedId;
    
    
    const includedProjectIds = [];
    
    
    if (productData.projectName && productData.projectName.trim()) {
      try {
        const projectName = productData.projectName.trim();
        
        
        let project = await db.collection("Projects").findOne({
          projectName: { $regex: new RegExp(`^${projectName}$`, 'i') }
        });

        if (project) {
          includedProjectIds.push(project._id);
        } else {
          
          
          
          const projectCount = await db.collection("Projects").countDocuments();
          const projectId = `PRJ${(projectCount + 1).toString().padStart(3, '0')}`;
          
          const newProject = {
            projectId: projectId,
            projectName: projectName,
            description: `Auto-created during product import`,
            startDate: new Date(),
            endDate: null,
            status: 'Active',
            racks: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const projectResult = await db.collection("Projects").insertOne(newProject);
          project = { _id: projectResult.insertedId, ...newProject };
          
          includedProjectIds.push(project._id);
        }
      } catch (includeError) {
        console.error('Error processing project from Project column:', includeError);
        
      }
    }
    
    
    if (productData.includedProjects && productData.includedProjects.trim()) {
      try {
        
        const projectNames = productData.includedProjects
          .split(',')
          .map(name => name.trim())
          .filter(name => name.length > 0);

        for (const projectName of projectNames) {
          
          const alreadyIncluded = includedProjectIds.some(async (id) => {
            const existingProject = await db.collection("Projects").findOne({ _id: id });
            return existingProject && existingProject.projectName.toLowerCase() === projectName.toLowerCase();
          });
          
          if (alreadyIncluded) {
            continue;
          }
          
          
          let project = await db.collection("Projects").findOne({
            $or: [
              { projectName: { $regex: new RegExp(`^${projectName}$`, 'i') } },
              { projectId: { $regex: new RegExp(`^${projectName}$`, 'i') } }
            ]
          });

          if (project) {
            includedProjectIds.push(project._id);
          } else {
            
            
            const projectCount = await db.collection("Projects").countDocuments();
            const projectId = `PRJ${(projectCount + 1).toString().padStart(3, '0')}`;
            
            const newProject = {
              projectId: projectId,
              projectName: projectName.trim(),
              description: `Auto-created during product import for included projects`,
              startDate: new Date(),
              endDate: null,
              status: 'Active',
              racks: [],
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            const projectResult = await db.collection("Projects").insertOne(newProject);
            project = { _id: projectResult.insertedId, ...newProject };
            
            includedProjectIds.push(project._id);
            console.log(`Created new project: ${project.projectName} with ID: ${project.projectId} for inclusion`);
          }
        }
      } catch (includeError) {
        console.error('Error processing additional included projects:', includeError);
        
      }
    }

    
    if (includedProjectIds.length > 0) {
      await db.collection("products").updateOne(
        { _id: productId },
        {
          $set: {
            includedProjects: includedProjectIds,
            updatedAt: new Date()
          }
        }
      );
    }
    
    
    const stockTransactions = [];
    
    
    if (productData.qtyIn && productData.qtyIn > 0) {
      const qtyInTransaction = {
        transactionId: `IMPORT_IN_${productId}_${Date.now()}`,
        type: 'in',
        productId: productId,
        productSKU: productData.productId.toString().trim(),
        productName: productData.productName.toString().trim(),
        quantity: productData.qtyIn,
        previousStock: 0,
        newStock: productData.qtyIn,
        projectName: productData.projectName?.toString().trim() || '',
        rackLocation: productData.assignedRack?.toString().trim() || '',
        remarks: `Import - Stock In: ${productData.remarks || 'Product import'}`,
        transactionDate: new Date(),
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      stockTransactions.push(qtyInTransaction);
    }
    
    
    if (productData.qtyOut && productData.qtyOut > 0) {
      const qtyOutTransaction = {
        transactionId: `IMPORT_OUT_${productId}_${Date.now()}`,
        type: 'out',
        productId: productId,
        productSKU: productData.productId.toString().trim(),
        productName: productData.productName.toString().trim(),
        quantity: productData.qtyOut,
        previousStock: productData.qtyIn || 0,
        newStock: (productData.qtyIn || 0) - productData.qtyOut,
        projectName: productData.projectName?.toString().trim() || '',
        rackLocation: productData.assignedRack?.toString().trim() || '',
        remarks: `Import - Stock Out: ${productData.remarks || 'Product import'}`,
        transactionDate: new Date(),
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      stockTransactions.push(qtyOutTransaction);
    }
    
    
    let transactionResults = [];
    if (stockTransactions.length > 0) {
      try {
        const transactionResult = await db.collection("stocktransactions").insertMany(stockTransactions);
        transactionResults = Object.values(transactionResult.insertedIds);
      } catch (transactionError) {
        console.error(`❌ Error creating stock transactions for product ${productData.productId}:`, transactionError);
        console.error('Transaction data that failed:', JSON.stringify(stockTransactions, null, 2));
        
      }
    }
    
    
    let assignedRackId = null;

    
    if (productData.assignedRack && !productData.projectName && productData.stockQuantity > 0) {
      try {
        
        let rack = await db.collection("racks").findOne({
          rackNumber: productData.assignedRack.toString().trim()
        });

        if (!rack) {
          
          const newRack = {
            rackNumber: productData.assignedRack.toString().trim(),
            location: '',
            capacity: 100, 
            products: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const rackResult = await db.collection("racks").insertOne(newRack);
          rack = { _id: rackResult.insertedId, ...newRack };
        }

        
        await db.collection("racks").updateOne(
          { _id: rack._id },
          {
            $addToSet: {
              products: {
                product: productId,
                stock: parseInt(productData.stockQuantity) || 0
              }
            },
            $set: {
              updatedAt: new Date()
            }
          }
        );
        
        assignedRackId = rack._id;
      } catch (rackError) {
        console.error('Error handling rack assignment:', rackError);
        
      }
    }

    
    if (productData.projectName) {
      try {
        
        let project = await db.collection("Projects").findOne({
          projectName: { $regex: new RegExp(`^${productData.projectName.trim()}$`, 'i') }
        });

        
        if (!project) {
          
          
          const projectCount = await db.collection("Projects").countDocuments();
          const projectId = `PRJ${(projectCount + 1).toString().padStart(3, '0')}`;
          
          const newProject = {
            projectId: projectId,
            projectName: productData.projectName.trim(),
            description: `Auto-created during product import`,
            startDate: new Date(),
            endDate: null,
            status: 'Active',
            racks: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const projectResult = await db.collection("Projects").insertOne(newProject);
          project = { _id: projectResult.insertedId, ...newProject };
          
          console.log(`Created new project: ${project.projectName} with ID: ${project.projectId}`);
        } else {
          console.log(`Found existing project: ${project.projectName} with ID: ${project.projectId}`);
        }

        
        if (productData.assignedRack) {
          const rack = await db.collection("racks").findOne({
            rackNumber: productData.assignedRack.toString().trim()
          });

          if (rack) {
            
            if (project.racks && !project.racks.some(rackId => rackId.toString() === rack._id.toString())) {
              
              await db.collection("Projects").updateOne(
                { _id: project._id },
                {
                  $addToSet: {
                    racks: rack._id
                  },
                  $set: {
                    updatedAt: new Date()
                  }
                }
              );
            }
            
            
            await db.collection("racks").updateOne(
              { _id: rack._id },
              {
                $addToSet: {
                  products: {
                    product: result.insertedId,
                    stock: parseInt(productData.stockQuantity) || 0
                  }
                },
                $set: {
                  updatedAt: new Date()
                }
              }
            );
          } else {
            
            const newRack = {
              rackNumber: productData.assignedRack.toString().trim(),
              location: 'Imported Rack',
              capacity: 100, 
              products: [{
                product: result.insertedId,
                stock: parseInt(productData.stockQuantity) || 0
              }],
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            const rackResult = await db.collection("racks").insertOne(newRack);
            
            
            await db.collection("Projects").updateOne(
              { _id: project._id },
              {
                $addToSet: {
                  racks: rackResult.insertedId
                },
                $set: {
                  updatedAt: new Date()
                }
              }
            );
          }
        }        } catch (projectError) {
          console.error('Error handling project assignment:', projectError);
          return NextResponse.json(
            { error: `Error processing project "${productData.projectName}": ${projectError.message}` },
            { status: 400 }
          );
        }
      }

    return NextResponse.json({
      success: true,
      message: 'Product imported successfully',
      productId: result.insertedId,
      product: productDocument,
      projectStatus: productData.projectName ? 'Project processed' : 'No project specified',
      rackStatus: productData.assignedRack ? 'Rack processed' : 'No rack specified',
      includedProjectsStatus: includedProjectIds.length > 0 ? `${includedProjectIds.length} projects included` : 'No included projects',
      stockInfo: {
        qtyIn: productData.qtyIn || 0,
        qtyOut: productData.qtyOut || 0,
        qtyRemaining: productData.qtyRemaining || 0,
        stockQuantity: productData.stockQuantity || 0
      },
      transactionInfo: {
        transactionsCreated: transactionResults.length,
        transactionIds: transactionResults,
        details: stockTransactions.map(t => ({ type: t.transactionType, qty: t.quantity }))
      }
    });

  } catch (error) {
    console.error('Product import error:', error);
    return NextResponse.json(
      { error: 'Failed to import product: ' + error.message },
      { status: 500 }
    );
  }
}
