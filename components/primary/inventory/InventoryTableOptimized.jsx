"use client";
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatusBadge from "@/components/shared/StatusBadge";
import { InventoryTableSkeleton } from "@/components/ui/skeleton";
import useOptimizedFetch from "@/hooks/use-optimized-fetch-clean";

const InventoryTableOptimized = ({ searchValue, selectedFilter, session }) => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const userRole = session?.user?.role;
  const canViewUpdates = userRole === "admin" || userRole === "manager" || userRole === "keeper";

  
  const { data: inventory, isLoading } = useOptimizedFetch("/api/Inventory", {
    staleTime: 30000, 
    cacheKey: "inventory-list",
  });

  
  const handleRowClick = (productId) => {
    router.push(`/inventory/manage-inventory/${productId}`);
  };

  
  const products = useMemo(() => {
    if (!inventory?.inventory) return [];

    return inventory.inventory.map((product) => ({
      _id: product._id,
      productName: product.productName,
      productSKU: product.productSKU,
      totalStock: product.totalStock,
      projectStocks: product.projectStocks || [],
      rackStocks: product.rackStocks || [],
      pendingTransfers: product.pendingTransfers || 0,
    }));
  }, [inventory]);

  
  const { filteredProducts, paginatedProducts, totalPages } = useMemo(() => {
    let filtered = products || [];
    
    
    if (searchValue) {
      filtered = filtered.filter((item) => {
        const productName = item.productName?.toLowerCase() || "";
        const productId = String(item._id).toLowerCase() || "";
        const productSKU = item.productSKU?.toLowerCase() || "";

        return (
          productName.includes(searchValue.toLowerCase()) ||
          productId.includes(searchValue.toLowerCase()) ||
          productSKU.includes(searchValue.toLowerCase())
        );
      });
    }

    
    if (selectedFilter === "in_stock") {
      filtered = filtered.filter((item) => item.totalStock > 0);
    } else if (selectedFilter === "out_of_stock") {
      filtered = filtered.filter((item) => item.totalStock === 0);
    }

    
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);

    return {
      filteredProducts: filtered,
      paginatedProducts: paginated,
      totalPages,
    };
  }, [products, searchValue, selectedFilter, currentPage]);

  
  const visibleProductIds = useMemo(() => 
    paginatedProducts.map(product => product._id), 
    [paginatedProducts]
  );

  const { data: pendingCounts } = useOptimizedFetch(
    canViewUpdates && visibleProductIds.length > 0 
      ? `/api/inventory/pending-counts?productIds=${visibleProductIds.join(',')}`
      : null,
    {
      staleTime: 15000, 
      cacheKey: `pending-counts-${visibleProductIds.join(',')}`,
    }
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 3; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 2; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("ellipsis");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (isLoading) {
    return <InventoryTableSkeleton />;
  }

  return (
    <div className="flex flex-col gap-5">
      <Table className="!rounded-xl">
        <TableHeader>
          <TableRow className="!border-black/6">
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Current Stock</TableHead>
            <TableHead className="text-left">STOCKS</TableHead>
            <TableHead className="text-left">TRANSFERS</TableHead>
            {canViewUpdates && (
              <TableHead className="text-center">PENDING UPDATES</TableHead>
            )}
            <TableHead className="text-right">ACTION</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedProducts?.map((product) => (
            <TableRow
              key={product._id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleRowClick(product._id)}
            >
              <TableCell>{product._id?.slice(-4) || "N/A"}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{product.productName}</span>
                  <span className="text-sm text-muted-foreground">
                    SKU: {product.productSKU}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge
                  status={product.totalStock > 0 ? "Active" : "Inactive"}
                  count={product.totalStock}
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {product.projectStocks?.length > 0 ? (
                    product.projectStocks.map((projectStock, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{projectStock.projectName}:</span>
                        {projectStock.quantity}
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No project stocks</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge
                  status={product.pendingTransfers > 0 ? "Pending" : "None"}
                  count={product.pendingTransfers}
                />
              </TableCell>
              {canViewUpdates && (
                <TableCell className="text-center">
                  <StatusBadge
                    status={
                      pendingCounts?.[product._id] > 0 ? "Pending" : "None"
                    }
                    count={pendingCounts?.[product._id] || 0}
                  />
                </TableCell>
              )}
              <TableCell className="text-right">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(product._id);
                  }}
                >
                  Manage
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePrevious();
                }}
                className={
                  currentPage === 1 ? "pointer-events-none opacity-50" : ""
                }
              />
            </PaginationItem>
            {getPageNumbers().map((pageNum, index) =>
              pageNum === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(pageNum);
                    }}
                    isActive={currentPage === pageNum}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleNext();
                }}
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default InventoryTableOptimized;
