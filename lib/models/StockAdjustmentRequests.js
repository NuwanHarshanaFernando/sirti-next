const { default: mongoose } = require("mongoose");

const stockAdjustmentRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  productId: { type: String, required: true },
  projectId: { type: String, required: true },
  projectName: { type: String, required: true },
  rackNumber: { type: String, required: true },
  stockOnHand: { type: Number, default: 0 },
  stockOnHold: { type: Number, default: 0 },
  currentRackStock: { type: Number, default: 0 },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  requestedBy: { type: String, required: true },
  requestedByName: { type: String },
  requestedAt: { type: Date, default: Date.now },
  approvedBy: { type: String },
  approvedByName: { type: String },
  approvedAt: { type: Date },
  type: { type: String, default: "stock_adjustment" },
  isRackLevel: { type: Boolean, default: false },
  failureReason: { type: String },
  failedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

stockAdjustmentRequestSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const StockAdjustmentRequestModel =
  mongoose.models.StockAdjustmentRequest ||
  mongoose.model("StockAdjustmentRequest", stockAdjustmentRequestSchema);

module.exports = StockAdjustmentRequestModel;
