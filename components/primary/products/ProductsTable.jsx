"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Pencil, CircleX } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import DeleteDialog from "@/components/popups/DeleteDialog";
import { DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
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
import ProjectBadge from "@/components/shared/project-badge";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";

const ProductsTable = ({ searchValue, selectedFilter, isParentLoading = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [products, setProducts] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleEditProduct = (productId) => {
    router.push(`/products/edit-product?id=${productId}`);
  };

  
  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    
    let filtered = [...products];

    if (selectedFilter === "in_stock") {
      filtered = filtered.filter((product) => product && (product.totalStocks || 0) > 0);
    } else if (selectedFilter === "out_of_stock") {
      filtered = filtered.filter((product) => !product || product.totalStocks === 0);
    } else if (selectedFilter === "low_stock") {
      filtered = filtered.filter((product) => {
        if (!product) return false;
        const threshold = product.threshold || 0;
        const totalStocks = product.totalStocks || 0;
        return totalStocks > 0 && totalStocks < threshold;
      });
    }

    return filtered;
  }, [products, selectedFilter]);

  const totalPages = Math.ceil(filteredProducts?.length / itemsPerPage);
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
    fetchProducts();
  }, [searchValue]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const url = searchValue ? `/api/Products?search=${encodeURIComponent(searchValue)}` : '/api/Products';
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();
      console.log('Fetched products:', data.products);
      setProducts(data.products);
    } catch (error) {
      toast.error("Failed to fetch products");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/Products/${productId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        
        await fetchProducts();
        
        const newTotalPages = Math.ceil((products.length - 1) / itemsPerPage);
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        }
        toast.success(`Product "${productName}" has been deleted successfully.`);
      } else {
        const errorData = await response.json();
        toast.error(
          errorData.message ||
            "Failed to delete product. Please try again."
        );
      }
    } catch (error) {
      toast.error("Failed to delete product. Please try again.");
    } finally {
      setIsDeleting(false);
    }  };
  
  
  if (isLoading || isParentLoading) {
    return <Skeleton className="w-full h-[320px]" />;
  }
  
  return (
    <div className="flex flex-col gap-5">
      <Table className="!rounded-xl">
        <TableHeader>
          <TableRow className="!border-black/6">
            <TableHead className="w-[100px]">ID/SKU</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Serial Number</TableHead>
            <TableHead>Available Projects</TableHead>
            <TableHead className="text-right">T. Stocks</TableHead>
            <TableHead className="text-right">Stock Value</TableHead>
            <TableHead className="text-right">Created By</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedProducts?.map((product) => (
            <TableRow key={product.productId}>
              <TableCell>{product.productId}</TableCell>
              <TableCell>
                <div className="flex flex-row items-center gap-2">
                  <div className="flex flex-row items-center justify-center w-12 h-12 rounded-lg p-1.5 bg-black/2">
                    <img
                      src={product.productImage || '/images/placeholder-image.png'}
                      alt={product.productName || 'Product'}
                      className="object-cover object-center"
                      onError={(e) => {
                        e.target.src = '/images/placeholder-image.png';
                        e.target.onerror = null; 
                      }}
                    />
                  </div>
                  {product.productName || 'Unnamed Product'}
                </div>
              </TableCell>
              <TableCell>{product.serialNumber || "N/A"}</TableCell>
              <TableCell className="flex flex-row max-w-[240px] flex-wrap items-center gap-1.5">
                {Array.isArray(product.projects) && product.projects.map((project, index) => (
                  <ProjectBadge
                    key={index}
                    color={project?.color || '#cccccc'}
                    project={project?.projectName || 'Unknown'}
                  />
                ))}
              </TableCell>
              <TableCell className="text-center">
                {product.totalStocks}
              </TableCell>
              <TableCell className="text-end">
                {product.totalStockValue !== null && product.totalStockValue !== undefined 
                  ? `QAR ${formatNumber(product.totalStockValue)}`
                  : 'QAR 0'}
              </TableCell>
              <TableCell className="text-end">
                {product.createdByName}
              </TableCell>
              <TableCell className="flex flex-row items-center justify-end gap-1 text-end">
                <Button
                  variant="action"
                  actionType="edit"
                  size="actionBtn"
                  onClick={() => handleEditProduct(product._id)}
                >
                  <Pencil />
                </Button>
                <DeleteDialog
                  triggerElement={
                    <DialogTrigger asChild>
                      <Button
                        variant="action"
                        actionType="delete"
                        size="actionBtn"
                        disabled={isDeleting}
                      >
                        <CircleX />
                      </Button>
                    </DialogTrigger>
                  }
                  title="Delete Product"
                  description={`Are you sure you want to delete "${product.productName}"? This action cannot be undone.`}
                  confirmButtonText={isDeleting ? "Deleting..." : "Delete"}
                  cancelButtonText="Cancel"
                  onConfirm={() =>
                    handleDeleteProduct(product._id, product.productName)
                  }
                  onCancel={() => {}}
                  accentColor="#ef4444"
                  showTag={false}
                />
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

export default ProductsTable;
