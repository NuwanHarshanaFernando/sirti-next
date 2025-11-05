import mongoose from "mongoose";

const assetHistorySchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
  action: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String }, 
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.models.AssetHistory || mongoose.model("AssetHistory", assetHistorySchema);
