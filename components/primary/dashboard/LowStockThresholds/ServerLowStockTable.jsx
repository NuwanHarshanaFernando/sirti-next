import { connectToDatabase } from "@/lib/mongodb";

async function fetchLowStockData() {
  try {
    
    const db = (await connectToDatabase()).db;
    
    
    let products = [];
    try {
      const productsCollection = await db.collection("products").find({}).toArray();
      const ProductsCollection = await db.collection("Products").find({}).toArray();
      products = productsCollection.length > 0 ? productsCollection : ProductsCollection;
    } catch (error) {
      console.error('❌ Server: Error fetching products:', error);
      return [];
    }

    
    let projects = [];
    try {
      projects = await db.collection("projects").find({}).toArray();
    } catch (e) {
      try {
        projects = await db.collection("Projects").find({}).toArray();
      } catch (e2) {
        return [];
      }
    }

    const lowStockThresholds = [];

    for (const product of products) {
      const threshold = product.threshold || product.lowStockThreshold || 0;
      let totalStock = 0;

      
      for (const project of projects) {
        try {
          
          let racks = [];
          try {
            racks = await db.collection("racks").find({ projectId: project._id.toString() }).toArray();
          } catch (e) {
            try {
              racks = await db.collection("rack").find({ projectId: project._id.toString() }).toArray();
            } catch (e2) {
              continue;
            }
          }

          for (const rack of racks) {
            if (rack.products && Array.isArray(rack.products)) {
              for (const rackProduct of rack.products) {
                if (rackProduct.productId === product._id.toString()) {
                  const stock = parseInt(rackProduct.quantity) || 0;
                  totalStock += stock;
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ Server: Error processing project ${project.name}:`, error);
        }
      }

      
      if (totalStock < threshold) {
        lowStockThresholds.push({
          _id: product._id,
          productId: product.productId || product.code || 'N/A',
          name: product.name || product.productName,
          totalStock: totalStock,
          threshold: threshold,
          projects: projects.map(p => ({ _id: p._id, name: p.name })),
          stockValue: (product.price || 0) * totalStock
        });
      }
    }

    return lowStockThresholds;
    
  } catch (error) {
    console.error('❌ Server: Error in fetchLowStockData:', error);
    return [];
  }
}

export default async function ServerLowStockTable() {
  const lowStockItems = await fetchLowStockData();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-row items-center justify-between">
        <h2>Low Stock Thresholds (Server-Side)</h2>
        <div className="flex flex-row items-center gap-1 text-blue-600 cursor-pointer">
          <p className="text-center">View all products</p>
          <span className="text-sm">→</span>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        {lowStockItems.length > 0 ? (
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">ID/SKU</th>
                  <th className="p-2 text-left">NAME</th>
                  <th className="p-2 text-left">AVAILABLE PROJECTS</th>
                  <th className="p-2 text-left">STOCKS</th>
                  <th className="p-2 text-left">STOCK VALUE</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item) => (
                  <tr key={item._id.toString()} className="border-b hover:bg-gray-50">
                    <td className="p-2">{item.productId}</td>
                    <td className="p-2 font-medium">{item.name}</td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        {item.projects.slice(0, 2).map((project) => (
                          <span key={project._id.toString()} className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded">
                            {project.name}
                          </span>
                        ))}
                        {item.projects.length > 2 && (
                          <span className="text-xs text-gray-500">+{item.projects.length - 2} more</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <span className="font-medium text-red-600">
                        {item.totalStock} / {item.threshold}
                      </span>
                    </td>
                    <td className="p-2">${item.stockValue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            No low stock items found
          </div>
        )}
      </div>
    </div>
  );
}
