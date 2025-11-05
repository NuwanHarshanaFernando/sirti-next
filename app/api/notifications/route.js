import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import StockTransactionService from "@/lib/services/StockTransactionService";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit")) || 50;
    const userRole = session.user.role;
    const userEmail = session.user.email;



    
    const [
      transfers,
      adjustmentRequests,
      stockTransactions,
      orderTransactions,
      products,
      projects,
      users,
      projectAssignments,
    ] = await Promise.all([
      
      db
        .collection("transfers")
        .find({})
        .sort({ createdAt: -1 })
        .limit(limit * 2) 
        .toArray(),

      db
        .collection("stockadjustmentrequests")
        .find({})
        .sort({ requestedAt: -1 })
        .limit(limit)
        .toArray(),

      
      db
        .collection("stocktransactions")
        .find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray(),

      
      db
        .collection("stocktransactions")
        .find({ status: "pending" })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray(),

      
      db
        .collection("products")
        .find({}, { projection: { productName: 1 } })
        .toArray(),

      
      db
        .collection("Projects")
        .find({}, { projection: { projectName: 1, color: 1 } })
        .toArray(),

      
      db
        .collection("users")
        .find({}, { projection: { name: 1, email: 1, availableProjects: 1, availaleProjects: 1, assignedProject: 1, projects: 1 } })
        .toArray(),

      
      db
        .collection("project-user-assignments")
        .find({})
        .toArray(),
    ]);

    
    const productMap = new Map();
    const projectMap = new Map();
    const userMap = new Map();

    products.forEach((product) => {
      productMap.set(
        product._id.toString(),
        product.productName || "Unknown Product"
      );
    });

    projects.forEach((project) => {
      projectMap.set(project._id.toString(), {
        name: project.projectName || "Unknown Project",
        color: project.color || "#6B7280",
      });
    });

    users.forEach((user) => {
      if (user._id) {
        const userIdString = user._id.toString();
        userMap.set(userIdString, user.name || user.email || "Unknown User");
      }
      if (user.email) {
        userMap.set(user.email, user.name || user.email || "Unknown User");
      }
    });


    
    

    transfers.forEach((transfer, index) => {

    });
    

    const formatTimestamp = (timestamp) => {
      if (!timestamp) return "Unknown time";
      try {
        return new Date(timestamp).toLocaleString();
      } catch (error) {
        return "Invalid date";
      }
    };

    const notifications = [];

    
    transfers.forEach((transfer) => {
      const fromIsExternal = transfer.fromProjectId === "EXTERNAL";
      const toIsExternal = transfer.toProjectId === "EXTERNAL";

      const sourceProjectName = fromIsExternal
        ? "EXTERNAL"
        : projectMap.get(transfer.fromProjectId?.toString())?.name ||
          "Unknown Project";
      const destinationProjectName = toIsExternal
        ? "EXTERNAL"
        : projectMap.get(transfer.toProjectId?.toString())?.name ||
          "Unknown Project";

      const productName =
        productMap.get(transfer.productId?.toString()) || "Unknown Product";
      const requestorName =
        userMap.get(transfer.requestedBy?.toString()) ||
        userMap.get(transfer.requestedBy) ||
        transfer.requestedBy ||
        "Unknown User";

      
      notifications.push({
        id: `transfer-request-${transfer._id}-source`,
        type: "transfer_request_source",
        iconColor: "#F59E0B",
        projectName: sourceProjectName,
        actionText: "created transfer request",
        itemName: productName,
        description: `${requestorName} created transfer request for ${productName} from ${sourceProjectName} to ${destinationProjectName}`,
        timestamp: formatTimestamp(transfer.createdAt || transfer.requestedAt),
        status: transfer.status,
        actor: requestorName,
        quantity: transfer.quantity,
        rawData: {
          ...transfer,
          activityType: "request",
          sourceProjectName,
          destinationProjectName,
          productName,
        },
      });

      
      if (transfer.status === "pending") {
        notifications.push({
          id: `transfer-request-${transfer._id}-admin`,
          type: "transfer_request_admin",
          iconColor: "#F59E0B",
          projectName: sourceProjectName,
          actionText: "pending transfer approval",
          itemName: productName,
          description: `Pending approval: Transfer of ${productName} from ${sourceProjectName} to ${destinationProjectName}`,
          timestamp: formatTimestamp(
            transfer.createdAt || transfer.requestedAt
          ),
          status: "pending",
          actor: requestorName,
          quantity: transfer.quantity,
          rawData: {
            ...transfer,
            activityType: "pending_approval",
            sourceProjectName,
            destinationProjectName,
            productName,
          },
        });
      } else if (transfer.status === "approved") {
        const approverName =
          userMap.get(transfer.approvedBy?.toString()) ||
          userMap.get(transfer.approvedBy) ||
          transfer.approvedBy ||
          "Admin";

        notifications.push({
          id: `transfer-approval-${transfer._id}-source`,
          type: "transfer_approval_source",
          iconColor: "#10B981",
          projectName: sourceProjectName,
          actionText: "approved transfer",
          itemName: productName,
          description: `${approverName} approved transfer of ${productName} from ${sourceProjectName} to ${destinationProjectName}`,
          timestamp: formatTimestamp(
            transfer.approvedAt || transfer.updatedAt || transfer.createdAt
          ),
          status: "approved",
          actor: approverName,
          quantity: transfer.quantity,
          rawData: {
            ...transfer,
            activityType: "approval",
            sourceProjectName,
            destinationProjectName,
            productName,
          },
        });

        notifications.push({
          id: `transfer-ready-${transfer._id}-destination`,
          type: "transfer_ready_destination",
          iconColor: "#0066CC",
          projectName: destinationProjectName,
          actionText: "ready to receive",
          itemName: productName,
          description: `Transfer of ${productName} from ${sourceProjectName} is ready to receive in ${destinationProjectName}`,
          timestamp: formatTimestamp(
            transfer.approvedAt || transfer.updatedAt || transfer.createdAt
          ),
          status: "ready_for_completion",
          actor: "System",
          quantity: transfer.quantity,
          destinationProjectId: transfer.toProjectId,
          sourceProjectId: transfer.fromProjectId,
          rawData: {
            ...transfer,
            activityType: "ready_for_completion",
            sourceProjectName,
            destinationProjectName,
            productName,
          },
        });
      } else if (transfer.status === "rejected") {
        const rejecterName =
          userMap.get(transfer.rejectedBy?.toString()) ||
          userMap.get(transfer.rejectedBy) ||
          transfer.rejectedBy ||
          "Admin";
        notifications.push({
          id: `transfer-rejection-${transfer._id}`,
          type: "transfer_rejection",
          iconColor: "#EF4444",
          projectName: "",
          actionText: "",
          itemName: "",
          description: `${rejecterName} rejected stock transfer for ${productName}`,
          timestamp: formatTimestamp(
            transfer.rejectedAt || transfer.updatedAt || transfer.createdAt
          ),
          status: "rejected",
          actor: rejecterName,
          quantity: transfer.quantity,
          rawData: {
            ...transfer,
            activityType: "rejection",
            sourceProjectName,
            destinationProjectName,
            productName,
          },
        });
      } else if (transfer.status === "completed") {
        const completerName =
          userMap.get(transfer.completedBy?.toString()) ||
          userMap.get(transfer.completedBy) ||
          transfer.completedBy ||
          destinationProjectName;
        notifications.push({
          id: `transfer-completion-${transfer._id}`,
          type: "transfer_completion",
          iconColor: "#06B6D4",
          projectName: "",
          actionText: "",
          itemName: "",
          description: `${completerName} completed stock transfer for ${productName}`,
          timestamp: formatTimestamp(
            transfer.completedAt || transfer.updatedAt || transfer.createdAt
          ),
          status: "completed",
          actor: completerName,
          quantity: transfer.quantity,
          rawData: {
            ...transfer,
            activityType: "completion",
            sourceProjectName,
            destinationProjectName,
            productName,
          },
        });
      }
    });

    
    adjustmentRequests.forEach((adjustment) => {
      const projectName =
        projectMap.get(adjustment.projectId?.toString())?.name ||
        adjustment.projectName ||
        "Unknown Project";
      const productName =
        productMap.get(adjustment.productId?.toString()) || "Unknown Product";
      const requestorName =
        userMap.get(adjustment.requestedBy?.toString()) ||
        userMap.get(adjustment.requestedBy) ||
        adjustment.requestedBy ||
        "Unknown User";

      if (adjustment.status === "pending") {
        notifications.push({
          id: `adjustment-request-${adjustment._id}`,
          type: "adjustment_request",
          iconColor: "#F59E0B",
          projectName: projectName,
          actionText: "requested stock adjustment",
          itemName: productName,
          description: `${requestorName} requested stock adjustment for ${productName} in ${projectName}`,
          timestamp: formatTimestamp(
            adjustment.requestedAt || adjustment.createdAt
          ),
          status: "pending",
          actor: requestorName,
          quantity: adjustment.stockOnHand || 0,
          rawData: {
            ...adjustment,
            activityType: "stock_adjustment_request",
            projectName,
            productName,
          },
        });
      } else if (adjustment.status === "approved") {
        const approverName =
          userMap.get(adjustment.approvedBy?.toString()) ||
          userMap.get(adjustment.approvedBy) ||
          adjustment.approvedBy ||
          "Admin";
        notifications.push({
          id: `adjustment-approval-${adjustment._id}`,
          type: "adjustment_approval",
          iconColor: "#10B981",
          projectName: "",
          actionText: "",
          itemName: "",
          description: `${approverName} approved stock adjustment for ${productName}`,
          timestamp: formatTimestamp(
            adjustment.approvedAt ||
              adjustment.updatedAt ||
              adjustment.createdAt
          ),
          status: "approved",
          actor: approverName,
          quantity: adjustment.stockOnHand || 0,
          rawData: {
            ...adjustment,
            activityType: "stock_adjustment_approval",
            projectName,
            productName,
          },
        });
      } else if (adjustment.status === "rejected") {
        const rejecterName =
          userMap.get(adjustment.rejectedBy?.toString()) ||
          userMap.get(adjustment.rejectedBy) ||
          adjustment.rejectedBy ||
          "Admin";
        notifications.push({
          id: `adjustment-rejection-${adjustment._id}`,
          type: "adjustment_rejection",
          iconColor: "#EF4444",
          projectName: "",
          actionText: "",
          itemName: "",
          description: `${rejecterName} rejected stock adjustment for ${productName}`,
          timestamp: formatTimestamp(
            adjustment.rejectedAt ||
              adjustment.updatedAt ||
              adjustment.createdAt
          ),
          status: "rejected",
          actor: rejecterName,
          quantity: adjustment.stockOnHand || 0,
          rawData: {
            ...adjustment,
            activityType: "stock_adjustment_rejection",
            projectName,
            productName,
          },
        });
      }
    });

    
    stockTransactions.forEach((transaction) => {
      
      if (
        transaction.items &&
        Array.isArray(transaction.items) &&
        transaction.items.length > 0
      ) {
        
        transaction.items.forEach((item, index) => {
          const productId = item.productId?.toString();
          const projectId = item.projectId?.toString();
          const productName = productMap.get(productId) || "Unknown Product";
          const projectName =
            projectMap.get(projectId)?.name || "General Warehouse";

          const transactionType = transaction.type === "in" ? "IN" : "OUT";
          const iconColor = transaction.type === "in" ? "#10B981" : "#EF4444"; 

          
          if (transaction.isOrderMode && transaction.status === "pending") {
            notifications.push({
              id: `order-request-${transaction._id}-item-${index}`,
              type: "order_request",
              iconColor: "#F59E0B", 
              projectName: projectName,
              actionText: "new order request",
              itemName: productName,
              description: `New order request: ${
                item.quantity
              } units of ${productName} for ${projectName}${
                transaction.invoiceNumber
                  ? ` (PO: ${transaction.invoiceNumber})`
                  : ""
              }`,
              timestamp: formatTimestamp(transaction.createdAt),
              status: "pending",
              actor: "Order System",
              quantity: item.quantity,
              rawData: {
                ...transaction,
                
                productId: productId,
                projectId: projectId,
                productName: productName,
                projectName: projectName,
                activityType: "order_request",
                transactionType: "ORDER",
                poNumber: transaction.invoiceNumber,
                recipient: transaction.supplierName,
              },
            });
          } else {
            
            notifications.push({
              id: `stock-transaction-${transaction._id}-item-${index}`,
              type: `stock_${transaction.type}`,
              iconColor: iconColor,
              projectName: projectName,
              actionText: `stock ${transaction.type}`,
              itemName: productName,
              description: `Stock ${transactionType}: ${
                item.quantity
              } units of ${productName} ${
                transaction.type === "in" ? "added to" : "removed from"
              } ${projectName}`,
              timestamp: formatTimestamp(transaction.createdAt),
              status: "completed",
              actor: "System",
              quantity: item.quantity,
              rawData: {
                ...transaction,
                
                productId: productId,
                projectId: projectId,
                productName: productName,
                projectName: projectName,
                activityType: `stock_${transaction.type}`,
                transactionType: transactionType,
              },
            });
          }
        });
      } else {
        
        
        let productId, productName;
        if (
          transaction.productId &&
          typeof transaction.productId === "object" &&
          transaction.productId.productName
        ) {
          
          productId =
            transaction.productId._id?.toString() ||
            transaction.productId.toString();
          productName = transaction.productId.productName;
        } else {
          
          productId = transaction.productId?.toString();
          productName = productMap.get(productId) || "Unknown Product";
        }

        
        let projectId, projectName;
        if (
          transaction.projectId &&
          typeof transaction.projectId === "object" &&
          transaction.projectId.projectName
        ) {
          
          projectId =
            transaction.projectId._id?.toString() ||
            transaction.projectId.toString();
          projectName = transaction.projectId.projectName;
        } else if (transaction.projectId && transaction.projectId !== null) {
          
          projectId = transaction.projectId.toString();
          projectName = projectMap.get(projectId)?.name || "Unknown Project";
        } else {
          
          projectId = null;
          projectName = "General Warehouse";
        }

        const transactionType = transaction.type === "in" ? "IN" : "OUT";
        const iconColor = transaction.type === "in" ? "#10B981" : "#EF4444"; 

        
        if (transaction.isOrderMode && transaction.status === "pending") {
          notifications.push({
            id: `order-request-${transaction._id}`,
            type: "order_request",
            iconColor: "#F59E0B", 
            projectName: projectName,
            actionText: "new order request",
            itemName: productName,
            description: `New order request: ${
              transaction.quantity
            } units of ${productName} for ${projectName}${
              transaction.poNumber ? ` (PO: ${transaction.poNumber})` : ""
            }`,
            timestamp: formatTimestamp(transaction.createdAt),
            status: "pending",
            actor: "Order System",
            quantity: transaction.quantity,
            rawData: {
              ...transaction,
              
              productId: productId,
              projectId: projectId,
              productName: productName,
              projectName: projectName,
              activityType: "order_request",
              transactionType: "ORDER",
            },
          });
        } else {
          
          notifications.push({
            id: `stock-transaction-${transaction._id}`,
            type: `stock_${transaction.type}`,
            iconColor: iconColor,
            projectName: projectName,
            actionText: `stock ${transaction.type}`,
            itemName: productName,
            description: `Stock ${transactionType}: ${
              transaction.quantity
            } units of ${productName} ${
              transaction.type === "in" ? "added to" : "removed from"
            } ${projectName}`,
            timestamp: formatTimestamp(transaction.createdAt),
            status: "completed",
            actor: "System",
            quantity: transaction.quantity,
            rawData: {
              ...transaction,
              
              productId: productId,
              projectId: projectId,
              productName: productName,
              projectName: projectName,
              activityType: `stock_${transaction.type}`,
              transactionType: transactionType,
            },
          });
        }
      }
    });

    
    orderTransactions.forEach((transaction) => {
      const productName =
        productMap.get(transaction.productId?.toString()) || "Unknown Product";
      const projectName =
        projectMap.get(transaction.projectId?.toString())?.name ||
        "Unknown Project";

      
      if (transaction.status === "pending") {
        notifications.push({
          id: `order-request-${transaction._id}`,
          type: "order_request",
          iconColor: "#F59E0B", 
          projectName: projectName,
          actionText: "new order request",
          itemName: productName,
          description: `New order request: ${
            transaction.quantity
          } units of ${productName} for ${projectName}${
            transaction.invoiceNumber
              ? ` (PO: ${transaction.invoiceNumber})`
              : ""
          }`,
          timestamp: formatTimestamp(transaction.createdAt),
          status: "pending",
          actor: "Order System",
          quantity: transaction.quantity,
          rawData: {
            ...transaction,
            
            productId: transaction.productId?.toString(),
            projectId: transaction.projectId?.toString(),
            productName: productName,
            projectName: projectName,
            activityType: "order_request",
            transactionType: "ORDER",
            poNumber: transaction.invoiceNumber, 
            recipient: transaction.supplierName, 
          },
        });
      }
    });

    
    const completionNotifications = await db
      .collection("notifications")
      .find({ type: "order_completion" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();



    completionNotifications.forEach((notification) => {
      const rawData = notification.rawData || {};

      
      if (
        rawData.items &&
        Array.isArray(rawData.items) &&
        rawData.items.length > 0
      ) {
        
        rawData.items.forEach((item, index) => {
          const productId = item.productId?.toString();
          const projectId = item.projectId?.toString();
          const productName =
            productMap.get(productId) || item.productName || "Unknown Product";
          const projectName =
            projectMap.get(projectId)?.name ||
            item.projectName ||
            "Unknown Project";
          const completedBy = rawData.completedBy || "Keeper";

          notifications.push({
            id: `order-completion-${
              rawData._id || notification._id
            }-item-${index}`,
            type: "order_completion",
            iconColor: "#10B981", 
            projectName: projectName,
            actionText: "completed order",
            itemName: productName,
            description: `${completedBy} completed order: ${item.quantity} units of ${productName} for ${projectName}`,
            timestamp: formatTimestamp(
              notification.timestamp || notification.createdAt
            ),
            status: "completed",
            actor: completedBy,
            quantity: item.quantity,
            rawData: {
              ...rawData,
              
              productId: productId,
              projectId: projectId,
              productName,
              projectName,
              activityType: "order_completion",
              transactionType: "ORDER_COMPLETION",
              createdAt: notification.createdAt, 
            },
          });
        });
      } else {
        
        const productId = rawData.productId?.toString();
        const projectId = rawData.projectId?.toString();
        const productName =
          productMap.get(productId) || rawData.productName || "Unknown Product";
        const projectName =
          projectMap.get(projectId)?.name ||
          rawData.projectName ||
          "Unknown Project";
        const completedBy = rawData.completedBy || "Keeper";

        notifications.push({
          id: `order-completion-${rawData._id || notification._id}`,
          type: "order_completion",
          iconColor: "#10B981", 
          projectName: projectName,
          actionText: "completed order",
          itemName: productName,
          description: `${completedBy} completed order: ${rawData.quantity} units of ${productName} for ${projectName}`,
          timestamp: formatTimestamp(
            notification.timestamp || notification.createdAt
          ),
          status: "completed",
          actor: completedBy,
          quantity: rawData.quantity,
          rawData: {
            ...rawData,
            
            productId: productId,
            projectId: projectId,
            productName,
            projectName,
            activityType: "order_completion",
            transactionType: "ORDER_COMPLETION",
            createdAt: notification.createdAt, 
          },
        });
      }
    });

    
    const sortedNotifications = notifications.sort((a, b) => {
      
      let aTime;
      let bTime;

      if (a.type === "order_completion") {
        aTime = new Date(a.rawData?.createdAt || a.timestamp || 0);
      } else {
        aTime = new Date(a.rawData?.createdAt || a.rawData?.requestedAt || 0);
      }

      if (b.type === "order_completion") {
        bTime = new Date(b.rawData?.createdAt || b.timestamp || 0);
      } else {
        bTime = new Date(b.rawData?.createdAt || b.rawData?.requestedAt || 0);
      }

      return bTime - aTime;
    });

    
    let filteredNotifications = [];

    if (userRole === "admin") {
      
      filteredNotifications = sortedNotifications;
    } else if (userRole === "manager" || userRole === "keeper") {
      
      const userProjects = [];

      
      const currentUser = users.find(
        (u) => u.email === userEmail || u._id.toString() === userEmail
      );
      const userId = currentUser?._id?.toString();



      if (currentUser) {
        
        
        const userAvailableProjects = currentUser.availableProjects || currentUser.availaleProjects;
        
        if (userAvailableProjects && Array.isArray(userAvailableProjects)) {
          
          userAvailableProjects.forEach((p) => {
            if (typeof p === "object" && p !== null) {
              if (p._id) {
                
                userProjects.push(p._id.toString());
              } else if (p.projectName) {
                
                const project = projects.find(proj => proj.projectName === p.projectName);
                if (project && project._id) {
                  userProjects.push(project._id.toString());
                }
              }
            } else if (p) {
              
              userProjects.push(p.toString());
            }
          });
        }

        if (currentUser.assignedProject) {
          const projectId =
            typeof currentUser.assignedProject === "object"
              ? currentUser.assignedProject._id?.toString()
              : currentUser.assignedProject.toString();

          if (projectId && !userProjects.includes(projectId)) {
            userProjects.push(projectId);
          }
        }

        if (currentUser.projects && Array.isArray(currentUser.projects)) {
          currentUser.projects.forEach((p) => {
            if (typeof p === "object" && p !== null && p._id) {
              userProjects.push(p._id.toString());
            } else if (p) {
              userProjects.push(p.toString());
            }
          });
        }

        
        const userAssignments = projectAssignments.filter(
          assignment => assignment.userId && assignment.userId.toString() === userId
        );
        
        
        userAssignments.forEach(assignment => {
          if (assignment.projectId) {
            const projectId = assignment.projectId.toString();
            if (!userProjects.includes(projectId)) {
              userProjects.push(projectId);
            }
          }
        });
      }



      
      const readyForCompletionNotifications = sortedNotifications.filter(
        (n) =>
          n.type === "transfer_ready_destination" &&
          n.rawData.toProjectId &&
          userProjects.includes(n.rawData.toProjectId.toString())
      );

      
      const otherRelevantNotifications = sortedNotifications.filter((n) => {
        if (readyForCompletionNotifications.some((rn) => rn.id === n.id)) {
          return false;
        }

        
        if (n.type === "order_request" && userRole === "keeper") {
      
          return true;
        }

        
        if (n.type === "order_completion") {
          
          if (userRole === "keeper") {
        
            return true;
          }
          
          if (userRole === "admin") {
       
            return true;
          }
        }

        
        if (
          n.rawData?.requestedBy === userEmail ||
          n.rawData?.requestedBy === userId ||
          n.rawData?.requestedBy?.toString() === userId
        ) {
          return true;
        }

        
        if (
          n.rawData?.approvedBy === userId ||
          n.rawData?.approvedBy?.toString() === userId ||
          n.rawData?.rejectedBy === userId ||
          n.rawData?.rejectedBy?.toString() === userId ||
          n.rawData?.completedBy === userId ||
          n.rawData?.completedBy?.toString() === userId
        ) {
          return true;
        }

        if (n.type.includes("transfer_")) {
          const sourceId = n.rawData.fromProjectId?.toString?.();
          const destId = n.rawData.toProjectId?.toString?.();

          return (
            (sourceId &&
              (sourceId === "EXTERNAL" || userProjects.includes(sourceId))) ||
            (destId && (destId === "EXTERNAL" || userProjects.includes(destId)))
          );
        }

        if (n.type.includes("adjustment_")) {
          const projectId = n.rawData.projectId?.toString?.();
          return projectId && userProjects.includes(projectId);
        }

        return false;
      });

      filteredNotifications = [
        ...readyForCompletionNotifications,
        ...otherRelevantNotifications,
      ];
    } else {
      
      const userProjects = [];

      
      const currentUser = users.find(
        (u) => u.email === userEmail || u._id.toString() === userEmail
      );
      const userId = currentUser?._id?.toString();

      if (currentUser) {
        if (
          currentUser.availableProjects &&
          Array.isArray(currentUser.availableProjects)
        ) {
          currentUser.availableProjects.forEach((p) => {
            if (typeof p === "object" && p !== null) {
              if (p._id) {
                
                userProjects.push(p._id.toString());
              } else if (p.projectName) {
                
                const project = projects.find(proj => proj.projectName === p.projectName);
                if (project && project._id) {
                  userProjects.push(project._id.toString());
                }
              }
            } else if (p) {
              userProjects.push(p.toString());
            }
          });
        }

        if (currentUser.assignedProject) {
          const projectId =
            typeof currentUser.assignedProject === "object"
              ? currentUser.assignedProject._id?.toString()
              : currentUser.assignedProject.toString();

          if (projectId && !userProjects.includes(projectId)) {
            userProjects.push(projectId);
          }
        }

        if (currentUser.projects && Array.isArray(currentUser.projects)) {
          currentUser.projects.forEach((p) => {
            if (typeof p === "object" && p !== null && p._id) {
              userProjects.push(p._id.toString());
            } else if (p) {
              userProjects.push(p.toString());
            }
          });
        }
      }

      filteredNotifications = sortedNotifications.filter((notification) => {
        
        if (
          notification.rawData?.requestedBy === userEmail ||
          notification.rawData?.requestedBy === userId ||
          notification.rawData?.requestedBy?.toString() === userId
        ) {
          return true;
        }

        
        if (
          notification.rawData?.approvedBy === userId ||
          notification.rawData?.approvedBy?.toString() === userId ||
          notification.rawData?.rejectedBy === userId ||
          notification.rawData?.rejectedBy?.toString() === userId ||
          notification.rawData?.completedBy === userId ||
          notification.rawData?.completedBy?.toString() === userId
        ) {
          return true;
        }

        
        if (notification.type === "transfer_ready_destination") {
          const matches = userProjects.includes(
            notification.rawData?.toProjectId?.toString?.()
          );
          return matches;
        }

        const sourceId = notification.rawData?.fromProjectId?.toString?.();
        const destId = notification.rawData?.toProjectId?.toString?.();
        const projectId = notification.rawData?.projectId?.toString?.();

        return (
          (sourceId && userProjects.includes(sourceId)) ||
          (destId && userProjects.includes(destId)) ||
          (projectId && userProjects.includes(projectId))
        );
      });
    }

    
    filteredNotifications = filteredNotifications.filter((notification) => {
      return !["stock_in", "stock_out", "order_request"].includes(
        notification.type
      );
    });

    
    const limitedNotifications = filteredNotifications.slice(0, limit);



    return NextResponse.json({
      success: true,
      notifications: limitedNotifications,
      count: limitedNotifications.length,
      metadata: {
        transfersProcessed: transfers.length,
        adjustmentsProcessed: adjustmentRequests.length,
        stockTransactionsProcessed: stockTransactions.length,
        orderTransactionsProcessed: orderTransactions.length,
        totalNotificationsGenerated: sortedNotifications.length,
        filteredNotificationsCount: filteredNotifications.length,
        userRole,
        userEmail,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Notifications API error:", error);
    return NextResponse.json(
      {
        error: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}
