import mongoose from 'mongoose';

const AssetsSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  productImage: { type: String, required: true },
  productCode: { type: String, required: true },
  serialNumber: { type: String, required: true },
  assetsManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceTerm: { type: String },
  manufacture: { type: String },
  purchaseDate: { type: Date },
  category: { type: String },
  nextServiceDate: { type: Date },
  dimensions: { type: String },
  weight: { type: String },
  productValue: { type: Number },
  assignedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Projects' },
  status: { type: String, enum: ['Operational', 'Under Maintain', 'Broken', 'Stolen'], default: 'Operational' },
});

export default mongoose.models.Assets || mongoose.model('Assets', AssetsSchema);