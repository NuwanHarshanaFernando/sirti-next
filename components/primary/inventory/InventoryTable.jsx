"use client";
import React, { useState, useMemo, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";

const InventoryTable = ({
  searchValue,
  selectedFilter,
  session,
  isParentLoading = false,
}) => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 
  const [inventory, setInventory] = useState();
  const [pendingRequestsCount, setPendingRequestsCount] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [toBeCompletedTransfers, setToBeCompletedTransfers] = useState({});

  const userRole = session?.user?.role;
  const canViewUpdates = userRole === "admin" || userRole === "manager";

  
  const handleRowClick = (productId) => {
    router.push(`/inventory/manage-inventory/${productId}`);
  }; 
  const products = useMemo(() => {
    if (!inventory) return [];

    
    return inventory.map((product) => ({
      _id: product.productId,
      productName: product.productName,
      productSKU: product.productSKU,
      productImage: product.productImage, 
      totalStock: product.totalStock,
      projectStocks: product.projectStocks || [],
      rackStocks: product.rackStocks || [],
      pendingTransfers: product.pendingTransfers || 0,
    }));
  }, [inventory]);

  const totalPages = Math.ceil(products?.length / itemsPerPage);
  const filteredProducts = useMemo(() => {
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
    return filtered;
  }, [products, searchValue, selectedFilter]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts?.slice(startIndex, endIndex);
  }, [currentPage, filteredProducts]);

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
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/Inventory", { cache: "no-store" });
        const data = await response.json();
        setInventory(data.inventory);
      } catch (error) {
        console.error("Error fetching inventory:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  
  useEffect(() => {
    const fetchPendingRequestsCount = async () => {
      if (!canViewUpdates || !inventory) return;

      try {
        const counts = {};

        
        const promises = inventory.map(async (product) => {
          const [transfersResponse, stockRequestsResponse] = await Promise.all([
            fetch(`/api/transfers?productId=${product._id}&status=pending`),
            fetch(
              `/api/stock-adjustment-requests?productId=${product._id}&status=pending`
            ),
          ]);

          const transfersData = transfersResponse.ok
            ? await transfersResponse.json()
            : { transfers: [] };
          const stockRequestsData = stockRequestsResponse.ok
            ? await stockRequestsResponse.json()
            : { requests: [] };

          const transfersCount = transfersData.transfers?.length || 0;
          const stockRequestsCount = stockRequestsData.requests?.length || 0;

          counts[product._id] = transfersCount + stockRequestsCount;
        });

        await Promise.all(promises);
        setPendingRequestsCount(counts);
      } catch (error) {
        console.error("Error fetching pending requests count:", error);
      }
    };

    fetchPendingRequestsCount();
  }, [inventory, canViewUpdates]);

  
  useEffect(() => {
    
    const fetchToBeCompletedTransfers = async () => {
      try {
        const response = await fetch("/api/transfers/to-be-completed");
        const data = await response.json();
        setToBeCompletedTransfers(data.transfersByProduct || {});
      } catch (error) {
        console.error("Error fetching to-be-completed transfers:", error);
        setToBeCompletedTransfers({});
      }
    };
    fetchToBeCompletedTransfers();
  }, [userRole]);

  
  if (isLoading || isParentLoading) {
    return (
      <div className="flex flex-col w-full gap-5">
        {[...Array(4)].map((_, idx) => (
          <Skeleton key={idx} className="w-full h-8 mb-2" shimmer={false} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col w-full gap-10">
        <div className=" w-[250px] animate-pulse bg-gray-200 rounded-lg h-24 flex-1"></div>
      </div>
      <Table className="!rounded-xl">
        <TableHeader>
          <TableRow className="!border-black/6">
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Current Stock</TableHead>
            <TableHead className="text-left">STOCKS</TableHead>
            <TableHead className="text-left">TRANSFERS</TableHead>
            <TableHead className="text-left">UPDATES</TableHead>
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
                  {product.productName}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-row flex-wrap gap-2">
                  {product.rackStocks?.length > 0 ? (
                    product.rackStocks
                      .filter((rack) => rack.stock > 0) 
                      .map((rack, idx) => (
                        <p
                          key={rack.rackNumber || idx}
                          className="text-sm text-accentOrange bg-accentOrange/20 rounded-md px-2 py-0.5"
                        >
                          {rack.rackNumber}: {rack.stock}
                        </p>
                      ))
                  ) : (
                    <p className="text-sm text-gray-500">No stock in racks</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-row flex-wrap gap-1">
                  {product.projectStocks?.length > 0 ? (
                    product.projectStocks.map((project, idx) => {
                      const textColor = project.color;
                      const bgColor = `${project.color}33`;
                      return (
                        <StatusBadge
                          key={project.projectId || idx}
                          style={{ backgroundColor: bgColor, color: textColor }}
                        >
                          <p>{project.projectName}:</p>
                          <p className="font-medium">{project.stocks}</p>
                        </StatusBadge>
                      );
                    })
                  ) : (
                    <StatusBadge className="text-gray-500 bg-gray-100">
                      <p>No project assignments</p>
                    </StatusBadge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-row gap-1">
                  <StatusBadge
                    className={`${
                      product.pendingTransfers > 0
                        ? "bg-orange-100 text-orange-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <p>{product.pendingTransfers} transfers</p>
                  </StatusBadge>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-row gap-1">
                  {(() => {
                    const pending = pendingRequestsCount[product._id] || 0;
                    const toBeCompleted =
                      toBeCompletedTransfers[product._id]?.length || 0;
                    const totalUpdates = pending + toBeCompleted;
                    return (
                      <StatusBadge
                        className={`$ {
                          totalUpdates > 0
                            ? "bg-amalfitanAzure/20 text-amalfitanAzure"
                            : "bg-gray-100 text-gray-500"
                        }`}
                        text={`${totalUpdates} NEW UPDATE${
                          totalUpdates !== 1 ? "S" : ""
                        }`}
                      />
                    );
                  })()}
                </div>
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

export default InventoryTable;
