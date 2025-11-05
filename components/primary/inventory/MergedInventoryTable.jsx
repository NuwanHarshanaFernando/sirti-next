"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
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
import ProjectBadge from "@/components/shared/project-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";

const MergedInventoryTable = ({
  searchValue,
  selectedFilter,
  selectedCategory,
  selectedProjectName,
  session,
  isParentLoading = false,
}) => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stockTransactions, setStockTransactions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  const userRole = session?.user?.role;

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchValue, selectedProjectName, selectedFilter, selectedCategory]);

  useEffect(() => {
    const fetchPaginatedInventory = async () => {
      try {
        setIsLoading(true);

        const params = new URLSearchParams();
        params.set("page", currentPage);
        params.set("limit", itemsPerPage);

        if (searchValue) {
          params.set("search", searchValue);
        }

        if (selectedCategory && selectedCategory !== "") {
          if (selectedCategory.includes(",")) {
            params.set("categories", selectedCategory);
          } else {
            params.set("category", selectedCategory);
          }
        }

        if (selectedProjectName) {
          params.set("project", selectedProjectName);
        }

        if (selectedFilter) {
          params.set("stock", selectedFilter);
        }

        const [inventoryResponse, stockTransactionsResponse] =
          await Promise.all([
            fetch(`/api/Inventory?${params.toString()}`, { cache: "no-store" }),
            fetch("/api/stock-management?limit=1000", { cache: "no-store" }),
          ]);
        const inventoryData = await inventoryResponse.json();
        const stockTransactionsData = await stockTransactionsResponse.json();
        setStockTransactions(stockTransactionsData.transactions || []);

        if (stockTransactionsData.transactions?.length === 0) {
          try {
            const debugResponse = await fetch("/api/debug-stock-collections", {
              cache: "no-store",
            });
            const debugData = await debugResponse.json();
          } catch (debugError) {
            console.error("Failed to debug collections:", debugError);
          }
        }

        setProducts(inventoryData.inventory || []);
        setTotalPages(inventoryData.totalPages || 1);
      } catch (error) {
        console.error("Error fetching inventory data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPaginatedInventory();
  }, [
    currentPage,
    searchValue,
    selectedCategory,
    selectedProjectName,
    selectedFilter,
  ]);

  const handleRowClick = (productId) => {
    // Open product details in a new tab as requested
    const url = `/inventory/manage-inventory/${productId}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      router.push(url);
    }
  };

  const handleEditProduct = (e, productId) => {
    e.stopPropagation();
    router.push(`/inventory/edit-product?id=${productId}`);
  };

  const stockSummary = useMemo(() => {
    const summary = {};

    for (const tx of stockTransactions || []) {
      // Only count completed transactions (order requests/pending should not affect totals)
      const status = tx.status || "completed";
      if (status !== "completed") continue;

      const txType = tx.type || tx.transactionType;
      if (!txType) continue;

      if (Array.isArray(tx.items) && tx.items.length > 0) {
        for (const it of tx.items) {
          const pid = it?.productId?.toString?.() || (typeof it?.productId === 'string' ? it.productId : null);
          if (!pid) continue;
          const qty = parseInt(it?.quantity, 10) || 0;
          if (!summary[pid]) summary[pid] = { stockIn: 0, stockOut: 0 };
          if (txType === "in") summary[pid].stockIn += qty;
          else if (txType === "out") summary[pid].stockOut += qty;
        }
      } else {
        const pid = tx?.productId?.toString?.() || (typeof tx?.productId === 'string' ? tx.productId : null);
        if (!pid) continue;
        const qty = parseInt(tx?.quantity, 10) || 0;
        if (!summary[pid]) summary[pid] = { stockIn: 0, stockOut: 0 };
        if (txType === "in") summary[pid].stockIn += qty;
        else if (txType === "out") summary[pid].stockOut += qty;
      }
    }

    return summary;
  }, [stockTransactions]);

  const calculateStockInQuantity = (productId) => {
    const productIdStr = productId?.toString();
    return stockSummary[productIdStr]?.stockIn || 0;
  };

  const calculateStockOutQuantity = (productId) => {
    const productIdStr = productId?.toString();
    return stockSummary[productIdStr]?.stockOut || 0;
  };

  const paginatedProducts = products;

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

  const calculateTotalStocks = (product) => {
    if (userRole === "admin") {
      return (
        product.projectStocks?.reduce(
          (total, project) => total + (project.stocks || 0),
          0
        ) || 0
      );
    } else if (userRole === "manager" || userRole === "keeper") {
      return (
        product.projectStocks?.reduce(
          (total, project) => total + (project.stocks || 0),
          0
        ) || 0
      );
    }
    return 0;
  };

  if (isLoading || isParentLoading) {
    return (
      <div className="flex flex-col w-full gap-5">
        <Table className="!rounded-xl">
          <TableHeader>
            <TableRow className="!border-black/6">
              <TableHead className="w-[150px]">ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead className="text-left">Quantity In</TableHead>
              <TableHead className="text-left">Quantity Out</TableHead>
              <TableHead className="text-left">Available Stocks</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, idx) => (
              <TableRow key={`skeleton-${idx}`}>
                <TableCell>
                  <Skeleton className="w-full h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-full h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-full h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-full h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-full h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-full h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-full h-6" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-full h-6" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Table className="!rounded-xl">
        <TableHeader>
          <TableRow className="!border-black/6">
            <TableHead className="w-[150px]">ID</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-left">Quantity In</TableHead>
            <TableHead className="text-left">Quantity Out</TableHead>
            <TableHead className="text-left">Available Stocks</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedProducts?.map((product) => (
            <TableRow
              key={product._id}
              onClick={() => handleRowClick(product._id)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <TableCell>
                {product.productId || String(product._id).slice(0, 6)}
              </TableCell>
              <TableCell>
                <div className="flex flex-row items-center gap-2">
                  <div className="flex flex-row items-center justify-center w-12 h-12 rounded-lg p-1.5 bg-black/2">
                    {product.productImage ? (
                      <img
                        src={product.productImage}
                        alt={product.productName}
                        className="object-cover object-center"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <img
                        src="/images/placeholder-image.png"
                        alt="Placeholder"
                        className="object-cover object-center"
                      />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <p title={product.productName || ""}>
                      {product.productName?.length > 50
                        ? product.productName.slice(0, 50) + "..."
                        : product.productName}
                    </p>
                    <span className="text-xs text-gray-500">
                      {product.productSKU}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-sm text-gray-700">
                  {product.category || "No Category"}
                </p>
              </TableCell>
              <TableCell>
                <p className="text-sm text-gray-700">
                  {(product.unit || "N/A").toUpperCase()}
                </p>
              </TableCell>
              <TableCell>
                <p className="font-normal">
                  {calculateStockInQuantity(product._id)}
                </p>
              </TableCell>
              <TableCell>
                <p className="font-normal">
                  {calculateStockOutQuantity(product._id)}
                </p>
              </TableCell>
              <TableCell>
                <p className="font-normal">{calculateTotalStocks(product)}</p>
              </TableCell>
              {/* <TableCell>
                <div className="flex flex-row flex-wrap gap-1">
                  {product.projectStocks?.length > 0 ? (
                    product.projectStocks.map((project, idx) => (
                      <ProjectBadge
                        key={project.projectId || idx}
                        color={project.color || "#718096"}
                        project={project.projectName}
                      />
                    ))
                  ) : (
                    <span className="text-gray-500">No projects</span>
                  )}
                </div>
              </TableCell> */}
              {(session?.user?.role === "admin" || session?.user?.role === "keeper" ) && (
                <TableCell className="flex flex-row items-center justify-end gap-1 text-end">
                  <Button
                    variant="action"
                    actionType="edit"
                    size="actionBtn"
                    onClick={(e) => handleEditProduct(e, product._id)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TableCell>
              )}
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
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            {getPageNumbers().map((page, index) => (
              <PaginationItem key={index}>
                {page === "ellipsis" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page);
                    }}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
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
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default MergedInventoryTable;
