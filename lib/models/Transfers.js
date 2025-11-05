const { default: mongoose } = require("mongoose");

const transferSchema = new mongoose.Schema({
  transferId: { type: String, required: true },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "products",
    required: true,
  },
  fromProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Projects",
    required: true,
  },
  toProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Projects",
    required: true,
  },
  quantity: { type: Number, required: true },
  approvedQuantity: { type: Number },
  reason: { type: String },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "completed"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const TransferModel =
  mongoose.models.Transfers || mongoose.model("Transfers", transferSchema);
export default TransferModel;
