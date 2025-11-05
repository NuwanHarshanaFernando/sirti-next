const { default: mongoose } = require("mongoose");

const stockTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ["in", "out"],
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Products",
    required: false
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Projects",
    required: false
  },
  rackId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "racks",
    required: false
  },
  quantity: {
    type: Number,
    required: false,
    min: 1
  },
  previousStock: {
    type: Number,
    required: false,
    min: 0
  },
  newStock: {
    type: Number,
    required: false,
    min: 0
  },

  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Products",
      required: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Projects",
      required: true
    },
    rackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "racks",
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    previousStock: {
      type: Number,
      required: true,
      min: 0
    },
    newStock: {
      type: Number,
      required: true,
      min: 0
    },
    productName: String,
    projectName: String,
    rackNumber: String
  }],
  invoiceNumber: {
    type: String,
    required: false
  },
  supplierName: {
    type: String,
    required: false
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: false
  },
  status: {
    type: String,
    enum: ["completed", "pending", "rejected", "cancelled"],
    default: "completed"
  },
  isOrderMode: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

stockTransactionSchema.index({ type: 1, createdAt: -1 });
stockTransactionSchema.index({ productId: 1, createdAt: -1 });
stockTransactionSchema.index({ projectId: 1, createdAt: -1 });
stockTransactionSchema.index({ rackId: 1, createdAt: -1 });
stockTransactionSchema.index({ status: 1, createdAt: -1 });
stockTransactionSchema.index({ createdAt: -1 });

stockTransactionSchema.virtual('transactionAge').get(function () {
  return new Date() - this.createdAt;
});

stockTransactionSchema.methods.getTransactionTypeLabel = function () {
  return this.type === 'in' ? 'Stock In' : 'Stock Out';
};

stockTransactionSchema.statics.findByProduct = function (productId, limit = 50) {
  return this.find({ productId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('productId', 'productName productSKU')
    .populate('projectId', 'projectName')
    .populate('createdBy', 'name email firstName lastName');
};

stockTransactionSchema.statics.findByProject = function (projectId, limit = 50) {
  return this.find({ projectId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('productId', 'productName productSKU')
    .populate('projectId', 'projectName')
    .populate('createdBy', 'name email firstName lastName');
};

stockTransactionSchema.statics.getStockSummary = function (productId) {
  return this.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: '$type',
        totalQuantity: { $sum: '$quantity' },
        transactionCount: { $sum: 1 }
      }
    }
  ]);
};

stockTransactionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

stockTransactionSchema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

const StockTransactionModel =
  mongoose.models.StockTransactions ||
  mongoose.model("StockTransactions", stockTransactionSchema, "stocktransactions");

export default StockTransactionModel;
