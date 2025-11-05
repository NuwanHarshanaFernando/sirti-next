import mongoose from "mongoose";

const assetTransferSchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  transferDate: { type: Date, default: Date.now },
});

export default mongoose.models.AssetTransfer || mongoose.model("AssetTransfer", assetTransferSchema);
