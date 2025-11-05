"use client";
import React, { useState, useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (response.ok) {
          const data = await response.json();
          setLowStockItems(data.lowStockThresholds);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLowStockItems([
          {
            sku: "C55412",
            image: "/images/router.png",
            name: "Huawei B663 Fiber ONT",
            availableProjects: [
              { name: "PROJECT A", color: "#E27100" },
              { name: "PROJECT B", color: "#007D51" },
            ],
            stocks: "9",
            StockValue: "7898.25",
          },
          {
            sku: "C33560",
            image: "/images/mesh.png",
            name: "Tp-Link Deco WiFi Mesh",
            availableProjects: [{ name: "PROJECT C", color: "#D32F2F" }],
            stocks: "9",
            StockValue: "7898.25",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleViewAllProducts = () => {
    router.push("/products?lowStock=1");
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-row items-center justify-between">
        <h2>Low Stock Thresholds</h2>
        <div
          className="flex flex-row items-center gap-1 cursor-pointer text-amalfitanAzure"
          onClick={handleViewAllProducts}
        >
          <p className="text-center">View all products</p>
          <ArrowUpRight className="w-5 mb-1" />
        </div>
      </div>
      <Table className="!rounded-xl">
        <TableHeader>
          <TableRow className="!border-black/6">
            <TableHead className="w-[100px]">ID/SKU</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Available Projects</TableHead>
            <TableHead className="text-right">Stocks</TableHead>
            <TableHead className="text-right">Stock Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lowStockItems.length > 0 ? (
            lowStockItems.map((item) => (
              <TableRow key={item.sku}>
                <TableCell>{item.sku}</TableCell>
                <TableCell>
                  <div className="flex flex-row items-center gap-2">
                    <div className="flex flex-row items-center justify-center w-12 h-12 rounded-lg p-1.5 bg-black/2">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="object-cover object-center"
                          onError={(e) => {
                            e.target.onerror = null; 
                            e.target.style.display = 'none'; 
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full bg-gray-100">
                          <span className="text-xs text-gray-400">No image</span>
                        </div>
                      )}
                    </div>
                    {item.name}
                  </div>
                </TableCell>
                <TableCell className="flex flex-row max-w-[240px] flex-wrap items-center gap-1.5">
                  {item.availableProjects && item.availableProjects.length > 0 ? (
                    item.availableProjects.map((project, index) => (
                      <ProjectBadge
                        key={index}
                        color={project.color}
                        project={project.name}
                      />
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">No projects</span>
                  )}
                </TableCell>
                <TableCell className="text-center">{item.stocks}</TableCell>
                <TableCell className="text-end">
                  QAR {formatNumber(item.StockValue)}
                </TableCell>
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
