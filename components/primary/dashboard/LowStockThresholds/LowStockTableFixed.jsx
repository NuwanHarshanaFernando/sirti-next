"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ProjectBadge from "@/components/shared/project-badge";
import { formatNumber } from "@/lib/utils";

const LowStockTable = () => {
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataFetched, setDataFetched] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    if (loading && !dataFetched) {
      setDataFetched(true);
      try {
        const response = await fetch("/api/dashboard");
        
        if (response.ok) {
          const data = await response.json();
          setLowStockItems(data.lowStockThresholds || []);
          setError(null);
        } else {
          console.warn('⚠️ LowStockTable: API response not ok:', response.status);
          setError(`API Error: ${response.status}`);
          setLowStockItems([]);
        }
      } catch (error) {
        console.error("❌ LowStockTable: Error fetching dashboard data:", error);
        setError(`Fetch Error: ${error.message}`);
        setLowStockItems([]);
      } finally {
        setLoading(false);
      }
    }
  };

  
  fetchData();


  const handleViewAllProducts = () => {
    router.push("/primary/products?filter=low_stock");
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-row items-center justify-between">
          <h2>Low Stock Thresholds</h2>
          <div className="flex flex-row items-center gap-1 cursor-pointer text-amalfitanAzure">
            <p className="text-center">View all products</p>
            <ArrowUpRight className="w-5 mb-1" />
          </div>
        </div>
        <div className="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-row items-center justify-between">
          <h2>Low Stock Thresholds</h2>
          <div className="flex flex-row items-center gap-1 cursor-pointer text-amalfitanAzure">
            <p className="text-center">View all products</p>
            <ArrowUpRight className="w-5 mb-1" />
          </div>
        </div>
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <p className="text-red-600">Error loading low stock data: {error}</p>
          <button 
            onClick={() => {
              setLoading(true);
              setError(null);
              setDataFetched(false);
            }}
            className="px-4 py-2 mt-2 text-white bg-red-600 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-row items-center justify-between">
        <h2>Low Stock Thresholds ({lowStockItems.length} items)</h2>
        <div 
          className="flex flex-row items-center gap-1 cursor-pointer text-amalfitanAzure hover:text-blue-700"
          onClick={handleViewAllProducts}
        >
          <p className="text-center">View all products</p>
          <ArrowUpRight className="w-5 mb-1" />
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID/SKU</TableHead>
            <TableHead>NAME</TableHead>
            <TableHead>AVAILABLE PROJECTS</TableHead>
            <TableHead>STOCKS</TableHead>
            <TableHead>STOCK VALUE</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lowStockItems.length > 0 ? (
            lowStockItems.map((item) => (
              <TableRow key={item._id}>
                <TableCell>{item.productId}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {item.projects?.slice(0, 2).map((project) => (
                      <ProjectBadge key={project._id} project={project} />
                    ))}
                    {item.projects?.length > 2 && (
                      <span className="text-xs text-gray-500">
                        +{item.projects.length - 2} more
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-red-600">
                    {item.totalStock} / {item.threshold}
                  </span>
                </TableCell>
                <TableCell>${formatNumber(item.stockValue)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                No low stock items found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default LowStockTable;
