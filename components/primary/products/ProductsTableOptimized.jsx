"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Pencil, CircleX } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import DeleteDialog from "@/components/popups/DeleteDialog";
import { DialogTrigger } from "@/components/ui/dialog";
import { ProductsTableSkeleton } from "@/components/ui/skeleton";
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

const ProductsTableOptimized = ({ searchValue, selectedFilter, isParentLoading = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 5;
  const router = useRouter();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = searchValue ? `/api/Products?search=${encodeURIComponent(searchValue)}` : '/api/Products';
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      console.log('Fetched products:', data.products);
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchValue]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleEditProduct = useCallback((productId) => {
    router.push(`/products/edit-product?id=${productId}`);
  }, [router]);

  const refetch = useCallback(() => {
    fetchProducts();
  }, [fetchProducts]);

  const { filteredProducts, totalPages } = useMemo(() => {
    let filtered = products;

    // Only filter by selectedFilter
    if (selectedFilter && selectedFilter !== "all") {
      filtered = filtered.filter((product) => {
        const totalStocks = parseInt(product.totalStocks) || 0;
        
        switch (selectedFilter) {
          case "in_stock":
            return totalStocks > 0;
          case "out_of_stock":
            return totalStocks === 0;
          default:
            return true;
        }
      });
    }

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    return { filteredProducts: filtered, totalPages };
  }, [products, selectedFilter, itemsPerPage]);

  
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const handleDeleteProduct = useCallback(async (productId) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/Products/${productId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        
        refetch();
        
        
        const newTotalPages = Math.ceil((filteredProducts.length - 1) / itemsPerPage);
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        }
      } else {
        toast.error("Failed to delete product");
      }
    } catch (error) {
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  }, [refetch, filteredProducts.length, itemsPerPage, currentPage]);

  
  if (isLoading || isParentLoading) {
    return <ProductsTableSkeleton />;
  }

  
  if (filteredProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-2 text-gray-500">No products found</div>
        {searchValue && (
          <div className="text-sm text-gray-400">
            Try adjusting your search terms or filters
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product Name</TableHead>
            <TableHead>Product ID</TableHead>
            <TableHead>Serial Number</TableHead>
            <TableHead>Total Stocks</TableHead>
            <TableHead>Projects</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedProducts.map((product) => (
            <TableRow key={product._id || product.productId}>
              <TableCell className="font-medium">
                {product.productName || "N/A"}
              </TableCell>
              <TableCell>{product.productSKU || product.productId || "N/A"}</TableCell>
              <TableCell>{product.serialNumber || "N/A"}</TableCell>
              <TableCell>
                <span className={`font-semibold ${
                  parseInt(product.totalStocks) > 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {formatNumber(product.totalStocks || 0)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {product.projects && product.projects.length > 0 ? (
                    product.projects.slice(0, 2).map((project, index) => (
                      <ProjectBadge
                        key={index}
                        projectName={project.projectName || project.name || "Unknown"}
                        className="text-xs"
                      />
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">No projects</span>
                  )}
                  {product.projects && product.projects.length > 2 && (
                    <span className="text-xs text-gray-500">
                      +{product.projects.length - 2} more
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProduct(product._id)}
                    className="w-8 h-8 p-0"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <DeleteDialog
                    onDelete={() => handleDeleteProduct(product._id)}
                    productName={product.productName}
                    isDeleting={isDeleting}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0 hover:bg-red-50 hover:border-red-200"
                      >
                        <CircleX className="w-4 h-4 text-red-500" />
                      </Button>
                    </DialogTrigger>
                  </DeleteDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
                const isCurrentPage = page === currentPage;
                const showPage = page === 1 || page === totalPages || 
                                Math.abs(page - currentPage) <= 1;

                if (!showPage) {
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                }

                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={isCurrentPage}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default ProductsTableOptimized;
