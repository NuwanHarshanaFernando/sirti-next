import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    sessionToken: { type: String, required: true, unique: true },
    expires: { type: Date, required: true },
    lastAccessed: { type: Date, default: Date.now },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, required: true, enum: ['admin', 'manager', 'staff', 'keeper'] },
    createdAt: { type: Date, default: Date.now },

 
  });

  const Sessionmodel = mongoose.models.sessions || mongoose.model('sessions', sessionSchema);

  export default  Sessionmodel;