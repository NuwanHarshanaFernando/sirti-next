const { default: mongoose } = require("mongoose");

const productSchema = {
    productId: { type: String, required: false },
    productName: { type: String, required: false, unique: true },
    stocks: { type: Number, required: false },
    price: { type: Number, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    category: { type: String, required: false },
    code: { type: String, required: false },
    dimensions: { type: String, required: false },
    weight: { type: Number, required: false },
    threshold: { type: Number, required: false },
    serialNo: { type: String, required: false }, // Optional field
    unit: { type: String, required: false }, // Optional field
    productImage: { type: String, required: false }, // URL or base64 string for product image
    createdBy:{type: mongoose.Schema.Types.ObjectId, ref: "users", required: false},
    includedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Projects" }], // Array of included project IDs
};


const ProductModel = mongoose.models.Products || mongoose.model("Products", productSchema);
export default ProductModel;