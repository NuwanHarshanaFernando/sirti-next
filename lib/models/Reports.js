import mongoose from "mongoose";

const reportSchema = {
    reportId: { type: String, required: true },
    type: { type: String, required: true },
    remark: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    reportData: { type: Object, required: true },
};


const ReportModel = mongoose.models.Reports || mongoose.model("Reports", reportSchema);
export default ReportModel;