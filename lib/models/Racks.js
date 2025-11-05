import mongoose from "mongoose";

const rackSchema = new mongoose.Schema({
  rackNumber: { type: String, required: true, unique: true }, // Unique identifier for the rack
  location: { type: String, required: true }, // Location of the rack
  capacity: { type: Number, required: true, default: 100 }, // Storage capacity
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      stock: { type: Number, required: true },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Racks = mongoose.models.Racks || mongoose.model("Racks", rackSchema);
export default Racks;
