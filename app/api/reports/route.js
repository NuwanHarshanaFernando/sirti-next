import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import ReportModel from "@/lib/models/Reports";

export async function GET(req) {
  const { db } = await connectToDatabase();
  
  const reports = await db
    .collection("Reports")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return Response.json({ reports });
}

export async function POST(req) {
  const { db } = await connectToDatabase();
  const body = await req.json();
  
  const { filter, dateRange, projectId, createdBy } = body;
  console.log(
    "Generating report with filter:",
    filter,
    "dateRange:",
    dateRange,
    "projectId:",
    projectId
  );

  
  let dateFilter = {};
  let transactionsDateFilter = {};
  if (dateRange && (dateRange.from || dateRange.to)) {
    const createdAtRange = {};
    const dateFieldRange = {};
    if (dateRange.from) {
      const from = new Date(dateRange.from);
      createdAtRange.$gte = from;
      dateFieldRange.$gte = from;
    }
    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      createdAtRange.$lte = toDate;
      dateFieldRange.$lte = toDate;
    }
    
    // Keep original createdAt range for collections that only have createdAt
    if (Object.keys(createdAtRange).length > 0) {
      dateFilter.createdAt = createdAtRange;
    }
    
    // For stocktransactions prefer `date` field, fallback to `createdAt` when `date` is missing/null
    if (Object.keys(dateFieldRange).length > 0) {
      transactionsDateFilter = {
        $or: [
          { date: dateFieldRange },
          { $and: [ { $or: [ { date: { $exists: false } }, { date: null } ] }, { createdAt: createdAtRange } ] }
        ]
      };
    }
  }

  
  let reportData = {};
  let remark = "";
  let type = filter;
  
  const formatDateRange = (dr) => {
    if (!dr || (!dr.from && !dr.to)) return "";
    const fromStr = dr.from ? new Date(dr.from).toLocaleDateString() : "";
    const toStr = dr.to ? new Date(dr.to).toLocaleDateString() : "";
    if (fromStr && toStr) return ` | Date Range: ${fromStr} - ${toStr}`;
    if (fromStr) return ` | From: ${fromStr}`;
    if (toStr) return ` | Until: ${toStr}`;
    return "";
  };

  if (filter === "stock_adjustments") {
    const query = { status: "approved", ...dateFilter };
    const adjustmentsRaw = await db
      .collection("stockadjustmentrequests")
      .find(query)
      .toArray();
    
    const productIds = Array.from(
      new Set(adjustmentsRaw.map((adj) => adj.productId).filter(Boolean))
    );
    const products = await db
      .collection("products")
      .find(
        {
          _id: {
            $in: productIds
              .map((id) => {
                try {
                  return new ObjectId(id);
                } catch {
                  return null;
                }
              })
              .filter(Boolean),
          },
        },
        { projection: { _id: 1, productName: 1, productId: 1 } }
      )
      .toArray();
    const productMap = {};
    products.forEach((p) => {
      productMap[p._id.toString()] = {
        productName: p.productName,
        sku: p.productId,
      };
    });
    const adjustments = adjustmentsRaw.map((adj) => {
      const prod = productMap[adj.productId] || {};
      return {
        date: adj.createdAt || adj.requestedAt || null,
        productName: prod.productName || adj.productId || "",
        sku: prod.sku || adj.productId || "",
        adjustedBy: adj.requestedBy || "",
        adjustedQuantity:
          adj.adjustedQuantity || adj.quantity || adj.stockOnHand || 0,
      };
    });
    reportData = { adjustments };
    remark = `Stock Adjustments Report (${adjustments.length} records)${formatDateRange(dateRange)}`;
  } else if (filter === "qty_in_out") {
    const baseQuery = {
      type: { $in: ["in", "out"] },
      $or: [
        { status: "completed" },
        { status: { $exists: false } },
        { status: null }
      ]
    };
    const query = Object.keys(transactionsDateFilter).length
      ? { $and: [ baseQuery, transactionsDateFilter ] }
      : baseQuery;
    const txs = await db
      .collection("stocktransactions")
      .find(query)
      .toArray();

    // Normalize transactions into item-level movements so multi-item tx are counted
    const movements = [];
    for (const tx of txs) {
      const txDate = tx.date ? new Date(tx.date) : (tx.createdAt ? new Date(tx.createdAt) : null);
      if (Array.isArray(tx.items) && tx.items.length > 0) {
        for (const it of tx.items) {
          const prodId = it.productId || it.product || it.productDetails?._id;
          const qty = parseInt(it.quantity) || 0;
          if (!prodId || !qty) continue;
          movements.push({ productId: prodId.toString(), quantity: qty, type: tx.type, date: txDate });
        }
      } else if (tx.productId && tx.quantity) {
        movements.push({ productId: tx.productId.toString(), quantity: parseInt(tx.quantity) || 0, type: tx.type, date: txDate });
      }
    }

    const productIds = Array.from(new Set(movements.map(m => m.productId).filter(Boolean)));

    const products = await db
      .collection("products")
      .find(
        {
          _id: {
            $in: productIds
              .map((id) => {
                try {
                  return new ObjectId(id);
                } catch {
                  return null;
                }
              })
              .filter(Boolean),
          },
        },
        { projection: { _id: 1, productName: 1, productId: 1, includedProjects: 1 } }
      )
      .toArray();

    const includedProjectsMap = {};
    if (products.length > 0) {
      const allIncludedProjectIds = Array.from(
        new Set(
          products.flatMap((p) =>
            Array.isArray(p.includedProjects)
              ? p.includedProjects.map((pid) => pid.toString())
              : []
          )
        )
      );
      let allProjects = [];
      if (allIncludedProjectIds.length > 0) {
        allProjects = await db
          .collection("Projects")
          .find(
            {
              _id: {
                $in: allIncludedProjectIds
                  .map((id) => {
                    try {
                      return new ObjectId(id);
                    } catch {
                      return null;
                    }
                  })
                  .filter(Boolean),
              },
            },
            { projection: { _id: 1, projectName: 1 } }
          )
          .toArray();
      }
      const projectNameMap = {};
      allProjects.forEach((p) => {
        projectNameMap[p._id.toString()] = p.projectName;
      });
      products.forEach((p) => {
        const sku = p.productId;
        if (Array.isArray(p.includedProjects)) {
          includedProjectsMap[sku] = p.includedProjects.map(
            (pid) => projectNameMap[pid.toString()] || "Unknown Project"
          );
        }
      });
    }
    const productMap = {};
    products.forEach((p) => {
      productMap[p._id.toString()] = {
        productName: p.productName,
        sku: p.productId,
      };
    });
    const grouped = {};
    movements.forEach((m) => {
      const prod = productMap[m.productId] || {};
      const dateStr = m.date ? m.date.toISOString().split("T")[0] : "Unknown Date";
      const key = `${m.productId}_${dateStr}`;
      if (!grouped[key]) {
        grouped[key] = {
          date: dateStr,
          productName: prod.productName || m.productId || "",
          SKU: prod.sku || m.productId || "",
          qty_in: 0,
          qty_out: 0,
        };
      }
      if (m.type === "in") grouped[key].qty_in += m.quantity || 0;
      else if (m.type === "out") grouped[key].qty_out += m.quantity || 0;
    });
    const transactions = Object.values(grouped);
    reportData = { transactions, includedProjects: includedProjectsMap };
    remark = `Qty In/Out Report (${transactions.length} records)${formatDateRange(dateRange)}`;
  } else if (filter === "project_qty_in_out") {
    // Include only completed (or legacy without status) transactions
    const statusFilter = {
      $or: [
        { status: "completed" },
        { status: { $exists: false } },
        { status: null }
      ]
    };
    let txQuery = statusFilter;
    if (
      projectId &&
      projectId !== "ALL" &&
      typeof projectId === "string" &&
      projectId.length === 24
    ) {
      // We'll filter after normalization by item.projectId or tx.projectId
      // Keep status/date filtering at DB level, project filter will be applied post-normalization
      txQuery = statusFilter;
    }
    if (Object.keys(transactionsDateFilter).length) {
      txQuery = { $and: [ statusFilter, transactionsDateFilter ] };
    }
    const txs = await db
      .collection("stocktransactions")
      .find(txQuery)
      .toArray();

    // Normalize into item-level movements with project info
    const movements = [];
    for (const tx of txs) {
      if (Array.isArray(tx.items) && tx.items.length > 0) {
        for (const it of tx.items) {
          const prodId = it.productId || it.product || it.productDetails?._id;
          const projId = it.projectId || it.project || it.projectDetails?._id;
          const qty = parseInt(it.quantity) || 0;
          if (!prodId || !projId || !qty) continue;
          movements.push({ productId: prodId.toString(), projectId: projId.toString(), quantity: qty, type: tx.type });
        }
      } else if (tx.productId && tx.projectId && tx.quantity) {
        movements.push({ productId: tx.productId.toString(), projectId: tx.projectId.toString(), quantity: parseInt(tx.quantity) || 0, type: tx.type });
      }
    }

    // Optional filter by specific project if provided
    const filteredMovements = (projectId && projectId !== "ALL" && typeof projectId === "string" && projectId.length === 24)
      ? movements.filter(m => m.projectId === projectId)
      : movements;

    const projectIds = Array.from(new Set(filteredMovements.map((m) => m.projectId).filter(Boolean)));
    const productIds = Array.from(new Set(filteredMovements.map((m) => m.productId).filter(Boolean)));

    let projects = [];
    if (projectIds.length > 0) {
      projects = await db
        .collection("Projects")
        .find(
          {
            _id: {
              $in: projectIds
                .map((id) => {
                  try {
                    return new ObjectId(id);
                  } catch {
                    return null;
                  }
                })
                .filter(Boolean),
            },
          },
          { projection: { _id: 1, projectName: 1 } }
        )
        .toArray();
    }
    const projectNameMap = {};
    projects.forEach((p) => {
      projectNameMap[p._id.toString()] = p.projectName;
    });
    const products = await db
      .collection("products")
      .find(
        {
          _id: {
            $in: productIds
              .map((id) => {
                try {
                  return new ObjectId(id);
                } catch {
                  return null;
                }
              })
              .filter(Boolean),
          },
        },
        { projection: { _id: 1, productName: 1, productId: 1 } }
      )
      .toArray();
    const productDataMap = {};
    products.forEach((p) => {
      productDataMap[p._id.toString()] = {
        productName: p.productName,
        sku: p.productId,
      };
    });
    const grouped = {};
    filteredMovements.forEach((m) => {
      const projKey = m.projectId;
      if (!grouped[projKey]) grouped[projKey] = [];
      let row = grouped[projKey].find((r) => r.productId === m.productId);
      if (!row) {
        const prod = productDataMap[m.productId] || {};
        row = {
          projectName: projectNameMap[projKey] || "Unknown Project",
          productName: prod.productName || m.productId,
          sku: prod.sku || m.productId,
          qty_in: 0,
          qty_out: 0,
          productId: m.productId,
        };
        grouped[projKey].push(row);
      }
      if (m.type === "in") row.qty_in += m.quantity || 0;
      else if (m.type === "out") row.qty_out += m.quantity || 0;
    });
    const result = {};
    Object.entries(grouped).forEach(([projId, rows]) => {
      result[projId] = {
        projectName: projectNameMap[projId] || "Unknown Project",
        rows: rows.map(({ projectName, productName, sku, qty_in, qty_out }) => ({
          projectName,
          productName,
          sku,
          qty_in,
          qty_out,
        })),
      };
    });
    reportData = { projects: result };
    remark = `Project Wise Qty In/Out Report (${Object.keys(result).length} projects)${formatDateRange(dateRange)}`;
  } else if (filter === "non_moving_items") {
    const products = await db
      .collection("products")
      .find({}, { projection: { _id: 1, productId: 1, productName: 1 } })
      .toArray();
    const allProductIds = products.map(p => p._id);
    let matchStage;
    const statusFilter = { $or: [ { status: "completed" }, { status: { $exists: false } }, { status: null } ] };
    if (Object.keys(transactionsDateFilter).length) {
      matchStage = { $and: [ { type: "out" }, { productId: { $in: allProductIds } }, statusFilter, transactionsDateFilter ] };
    } else {
      matchStage = { $and: [ { type: "out" }, { productId: { $in: allProductIds } }, statusFilter ] };
    }
    const qtyOutAgg = await db.collection("stocktransactions").aggregate([
      { $match: matchStage },
      { $group: { _id: "$productId", totalOut: { $sum: "$quantity" } } }
    ]).toArray();
    const qtyOutMap = {};
    qtyOutAgg.forEach(row => { qtyOutMap[row._id?.toString()] = row.totalOut; });
    const racks = await db.collection("racks").find({}, { projection: { products: 1 } }).toArray();
    const stockMap = {};
    racks.forEach(rack => {
      if (Array.isArray(rack.products)) {
        rack.products.forEach(prod => {
          const prodId = (typeof prod.product === 'object' && prod.product.$oid) ? prod.product.$oid : prod.product?.toString();
          if (!prodId) return;
          stockMap[prodId] = (stockMap[prodId] || 0) + (prod.stock || 0);
        });
      }
    });
    const nonMovingProducts = products.filter(p => {
      const totalOut = qtyOutMap[p._id.toString()] || 0;
      return !totalOut || totalOut === 0;
    }).map(p => ({
      productName: p.productName,
      SKU: p.productId,
      currentStock: stockMap[p._id.toString()] || 0
    }));
    reportData = { nonMovingProducts };
    remark = `Non-moving Items Report (${nonMovingProducts.length} products)${formatDateRange(dateRange)}`;
  } else if (filter === "total_stocks") {
    const projectQuery = dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {};
    const projects = await db.collection("Projects").find(projectQuery, { projection: { _id: 1, projectName: 1, racks: 1, users: 1, warehouseManager: 1 } }).toArray();
    const allUserIds = Array.from(new Set(projects.map(p => (p.warehouseManager && typeof p.warehouseManager === 'object' && p.warehouseManager.$oid) ? p.warehouseManager.$oid : p.warehouseManager).filter(Boolean)));
    let managers = [];
    if (allUserIds.length > 0) {
      managers = await db.collection("users").find({ _id: { $in: allUserIds.map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) } }, { projection: { _id: 1, name: 1 } }).toArray();
    }
    const managerMap = {};
    managers.forEach(m => { managerMap[m._id.toString()] = m.name; });
    const allRackIds = Array.from(new Set(projects.flatMap(p => (Array.isArray(p.racks) ? p.racks.map(r => (typeof r === 'object' && r.$oid) ? r.$oid : r) : []))));
    const racks = await db.collection("racks").find({ _id: { $in: allRackIds.map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) } }).toArray();
    const rackMap = {};
    racks.forEach(rack => { rackMap[rack._id.toString()] = rack; });
    const stockRows = [];
    for (const project of projects) {
      const projectName = project.projectName || project._id.toString();
      const projectId = project._id.toString();
      const rackIds = Array.isArray(project.racks) ? project.racks.map(r => (typeof r === 'object' && r.$oid) ? r.$oid : r) : [];
      let availableStocks = 0;
      for (const rackId of rackIds) {
        const rack = rackMap[rackId];
        if (!rack || !Array.isArray(rack.products)) continue;
        for (const prod of rack.products) {
          availableStocks += prod.stock || 0;
        }
      }
      let managerId = project.warehouseManager;
      if (managerId && typeof managerId === 'object' && managerId.$oid) managerId = managerId.$oid;
      const managerName = managerId ? (managerMap[managerId] || managerId) : "";
      stockRows.push({
        projectName,
        manager: managerName,
        racksCount: rackIds.length,
        availableStocks
      });
    }
    reportData = { totalStocks: stockRows };
    remark = `Total Stock Summary Report (${stockRows.length})${formatDateRange(dateRange)}`;
  } else {
    remark = "Unknown report type";
  }
  
  const reportDoc = {
    reportId: `REPORT_${Date.now()}`,
    type,
    remark,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: createdBy ? createdBy : null,
    reportData,
  };
  await db.collection("Reports").insertOne(reportDoc);
  return Response.json({ success: true, report: reportDoc });
}
