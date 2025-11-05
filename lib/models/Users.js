import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  accessCode: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ["admin", "manager", "staff", "keeper"] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  assignedProject: { type: mongoose.Schema.Types.ObjectId, ref: "Projects" }, // 1 manager can have only 1 project
});

const Usermodel = mongoose.models.users || mongoose.model("users", userSchema);

export default Usermodel;
