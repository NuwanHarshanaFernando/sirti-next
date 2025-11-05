import StockTransactionModel from "@/lib/models/StockTransactions";
import ProductModel from "@/lib/models/Products";
import ProjectModel from "@/lib/models/Projects";
import UserModel from "@/lib/models/Users";
import mongoose from "mongoose";

/**
 * Utility functions for managing stock transactions
 */

export class StockTransactionService {
  /**
   * Ensure MongoDB connection for Mongoose
   */
  static async ensureConnection() {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  }

  /**
   * Create a new stock transaction
   */
  static async createTransaction(transactionData) {
    await this.ensureConnection();
    
    const transaction = new StockTransactionModel(transactionData);
    return await transaction.save();
  }

  /**
   * Create multiple stock transactions
   */
  static async createTransactions(transactionsData) {
    await this.ensureConnection();
    
    return await StockTransactionModel.insertMany(transactionsData);
  }

  /**
   * Get transactions by product ID
   */
  static async getTransactionsByProduct(productId, limit = 50, skip = 0) {
    await this.ensureConnection();
    
    return await StockTransactionModel.findByProduct(productId, limit);
  }

  /**
   * Get transactions by project ID
   */
  static async getTransactionsByProject(projectId, limit = 50, skip = 0) {
    await this.ensureConnection();
    
    return await StockTransactionModel.findByProject(projectId, limit);
  }

  /**
   * Get stock summary for a product
   */
  static async getStockSummary(productId) {
    await this.ensureConnection();
    
    return await StockTransactionModel.getStockSummary(productId);
  }

  /**
   * Get transactions with filters
   */
  static async getTransactions(filters = {}, options = {}) {
    await this.ensureConnection();
    
    const {
      type,
      productId,
      projectId,
      rackId,
      dateFrom,
      dateTo,
      createdBy
    } = filters;

    const {
      limit = 50,
      skip = 0,
      sort = { createdAt: -1 },
      populate = true
    } = options;

    let query = {};
    
    if (type) query.type = type;
    if (productId) query.productId = productId;
    if (projectId) query.projectId = projectId;
    if (rackId) query.rackId = rackId;
    if (createdBy) query.createdBy = createdBy;
    
    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    let queryBuilder = StockTransactionModel
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    if (populate) {
      queryBuilder = queryBuilder
        .populate('productId', 'productName productSKU productId')
        .populate('projectId', 'projectName')
        .populate('createdBy', 'name email firstName lastName');
    }

    const transactions = await queryBuilder.lean();
    const total = await StockTransactionModel.countDocuments(query);

    return {
      transactions,
      total,
      limit,
      skip,
      hasMore: skip + limit < total
    };
  }

  /**
   * Get recent transactions
   */
  static async getRecentTransactions(limit = 10) {
    await this.ensureConnection();
    
    return await StockTransactionModel
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('productId', 'productName productSKU')
      .populate('projectId', 'projectName')
      .populate('createdBy', 'name email firstName lastName')
      .lean();
  }

  /**
   * Get transaction statistics
   */
  static async getTransactionStats(filters = {}) {
    await this.ensureConnection();
    
    const { productId, projectId, dateFrom, dateTo } = filters;
    
    let matchQuery = {};
    if (productId) matchQuery.productId = new mongoose.Types.ObjectId(productId);
    if (projectId) matchQuery.projectId = new mongoose.Types.ObjectId(projectId);
    
    if (dateFrom || dateTo) {
      matchQuery.createdAt = {};
      if (dateFrom) matchQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchQuery.createdAt.$lte = new Date(dateTo);
    }

    return await StockTransactionModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$type',
          totalQuantity: { $sum: '$quantity' },
          transactionCount: { $sum: 1 },
          avgQuantity: { $avg: '$quantity' }
        }
      },
      {
        $project: {
          type: '$_id',
          totalQuantity: 1,
          transactionCount: 1,
          avgQuantity: { $round: ['$avgQuantity', 2] },
          _id: 0
        }
      }
    ]);
  }

  /**
   * Get monthly transaction trends
   */
  static async getMonthlyTrends(months = 6) {
    await this.ensureConnection();
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    return await StockTransactionModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            type: '$type'
          },
          totalQuantity: { $sum: '$quantity' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.type': 1
        }
      }
    ]);
  }

  /**
   * Delete a transaction (use with caution)
   */
  static async deleteTransaction(transactionId) {
    await this.ensureConnection();
    
    return await StockTransactionModel.findByIdAndDelete(transactionId);
  }

  /**
   * Update a transaction (use with caution)
   */
  static async updateTransaction(transactionId, updateData) {
    await this.ensureConnection();
    
    return await StockTransactionModel.findByIdAndUpdate(
      transactionId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
  }
}

export default StockTransactionService;
