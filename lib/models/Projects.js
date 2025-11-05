const { default: mongoose } = require("mongoose");

const projectSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  projectName: { type: String, required: true, unique: true },
  users: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
  ],
  products: [
    {
      productObjId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Products",
        required: true,
      },
      stocks: { type: Number, required: true },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  warehouseLocation: { type: String, required: false },
  color: { type: String, required: true },
  warehouseContact: { type: String, required: false },
  warehouseCapacity: { type: String, required: false },
  racks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Racks",
    },
  ],
  warehouseManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
    unique: true,
  },
  assignedManagers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

const ProjectModel =
  mongoose.models.Projects || mongoose.model("Projects", projectSchema);
export default ProjectModel;
