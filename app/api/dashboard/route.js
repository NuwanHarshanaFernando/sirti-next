import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let userProjects = [];
    
    if (user.role === 'admin') {
      userProjects = await db.collection("Projects").find({}).toArray();
    } else {
      userProjects = await db.collection("Projects").find({
        $or: [
          { warehouseManager: user._id },
          { assignedManagers: user._id },
          { users: user._id },
          { _id: user.assignedProject }
        ]
      }).toArray();
    }

    const userProjectIds = userProjects.map(p => p._id);

    const [
      allProducts,
      allRacks,
      transfersData,
      recentStockRequests,
      recentItems
    ] = await Promise.all([
      db.collection("products").find({}).toArray(),
      
      
      db.collection("racks").find({ 
        _id: { $in: userProjects.flatMap(p => p.racks || []) }
      }).toArray(),
      
      
      db.collection("transfers").find({
        $or: [
          { fromProjectId: { $in: userProjectIds.map(id => id.toString()) } },
          { toProjectId: { $in: userProjectIds.map(id => id.toString()) } }
        ]
      }).sort({ createdAt: -1 }).toArray(),
      
      
      db.collection("stockAdjustmentRequests")
        .find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
      
      
      db.collection("products")
        .find({})
        .sort({ createdAt: -1 })
        .limit(8)
        .toArray()
    ]);

    const totalItemsCount = allProducts.length;

    
    
    
    const racksByProject = new Map();
    userProjects.forEach(project => {
      if (project.racks && project.racks.length > 0) {
        racksByProject.set(project._id.toString(), 
          allRacks.filter(rack => 
            project.racks.some(rackId => rackId.toString() === rack._id.toString())
          )
        );
      }
    });

    
    let totalInventoryStocks = 0;
    let outOfStockCount = 0;
    const productStockMap = new Map(); 

    
    allRacks.forEach(rack => {
      if (rack.products && rack.products.length > 0) {
        rack.products.forEach(productInRack => {
          if (productInRack.stock > 0) {
            totalInventoryStocks += productInRack.stock;
            
            
            const productId = productInRack.product.toString();
            const currentStock = productStockMap.get(productId) || 0;
            productStockMap.set(productId, currentStock + productInRack.stock);
          }
        });
      }
    });

    
    allProducts.forEach(product => {
      const productStock = productStockMap.get(product._id.toString()) || 0;
      if (productStock === 0) {
        outOfStockCount++;
      }
    });

    
    const incomingTransfers = transfersData.filter(transfer => 
      userProjectIds.some(id => id.toString() === transfer.toProjectId) && 
      transfer.status === "pending"
    );

    const outgoingTransfers = transfersData.filter(transfer => 
      userProjectIds.some(id => id.toString() === transfer.fromProjectId) && 
      transfer.status === "pending"
    );

    
    const recentActivities = [];

    
    const recentTransfers = transfersData.slice(0, 10);

    
    const productIds = [...new Set([
      ...recentTransfers.map(t => t.productId),
      ...recentStockRequests.map(r => r.productId)
    ])];

    const projectIds = [...new Set([
      ...recentTransfers.flatMap(t => [t.fromProjectId, t.toProjectId])
    ])];

    
    const [activityProducts, activityProjects] = await Promise.all([
      db.collection("products").find({ 
        _id: { $in: productIds.map(id => new ObjectId(id)) }
      }).toArray(),
      
      db.collection("Projects").find({ 
        _id: { $in: projectIds.map(id => new ObjectId(id)) }
      }).toArray()
    ]);

    
    const productMap = new Map(activityProducts.map(p => [p._id.toString(), p]));
    const projectMap = new Map(activityProjects.map(p => [p._id.toString(), p]));

    
    recentTransfers.forEach(transfer => {
      const product = productMap.get(transfer.productId);
      const fromProject = projectMap.get(transfer.fromProjectId);
      const toProject = projectMap.get(transfer.toProjectId);

      let activityType = "stockTransfer";
      let description = "created stock transfer for";
      let actor = fromProject ? fromProject.projectName : "Unknown Project";

      if (transfer.status === "approved") {
        activityType = "stockApproval";
        description = "approved stock movement for";
        actor = transfer.approvedBy || "Admin";
      }

      recentActivities.push({
        id: transfer._id,
        type: activityType,
        actor: actor,
        description: description,
        timestamp: new Date(transfer.createdAt).toLocaleDateString() + " at " + new Date(transfer.createdAt).toLocaleTimeString(),
        item: product ? product.productName : "Unknown Product",
        status: transfer.status
      });
    });

    
    recentStockRequests.forEach(request => {
      const product = productMap.get(request.productId);
      
      recentActivities.push({
        id: request._id,
        type: "stockRequest",
        actor: request.requestedBy || "Manager",
        description: "created stock request for",
        timestamp: new Date(request.createdAt).toLocaleDateString() + " at " + new Date(request.createdAt).toLocaleTimeString(),
        item: product ? product.productName : "Unknown Product",
        status: request.status
      });
    });

    
    recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = recentActivities.slice(0, 5);

    
    const formattedRecentItems = recentItems.map(product => {
      
      const totalStock = productStockMap.get(product._id.toString()) || 0;

      return {
        _id: product._id,
        itemName: product.productName,
        price: product.price || "0.00",
        stockQuantity: totalStock.toString(),
        stockStatus: totalStock > 0 ? "in Stock" : "out of Stock",
        imageSrc: product.productImage || null,
        category: product.category
      };
    });

    
    const lowStockProducts = [];

    allProducts.forEach(product => {
      if (product.threshold && product.threshold > 0) {
        const totalStock = productStockMap.get(product._id.toString()) || 0;
        
        
        if (totalStock <= product.threshold && totalStock > 0) {
          
          const projectsWithStock = [];
          
          userProjects.forEach(project => {
            const projectRacks = racksByProject.get(project._id.toString()) || [];
            const hasProduct = projectRacks.some(rack => 
              rack.products && rack.products.some(p => 
                p.product.toString() === product._id.toString()
              )
            );
            
            const productInProjectAssignment = project.products?.find(
              p => p.productObjId?.toString() === product._id.toString()
            );

            if (hasProduct || productInProjectAssignment) {
              projectsWithStock.push({
                name: project.projectName,
                color: project.color
              });
            }
          });

          lowStockProducts.push({
            sku: product.productId || product.code || "N/A",
            image: product.productImage || null,
            name: product.productName,
            availableProjects: projectsWithStock,
            stocks: totalStock.toString(),
            StockValue: (totalStock * (product.price || 0)).toFixed(2),
            threshold: product.threshold
          });
        }
      }
    });

    
    lowStockProducts.sort((a, b) => parseInt(a.stocks) - parseInt(b.stocks));

    const dashboardData = {
      inventorySummary: {
        totalItems: totalItemsCount,
        inventory: totalInventoryStocks,
        outOfStock: outOfStockCount,
        incoming: incomingTransfers.length,
        outgoing: outgoingTransfers.length
      },
      recentActivity: limitedActivities,
      recentItems: formattedRecentItems,
      lowStockThresholds: lowStockProducts.slice(0, 10), 
      userRole: user.role,
      userProjects: userProjects.map(p => ({
        id: p._id,
        name: p.projectName,
        color: p.color
      }))
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
