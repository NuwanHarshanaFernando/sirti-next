import React, { useState, useMemo, useEffect } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis 
} from '@/components/ui/pagination';

const TransferTable = ({ 
  transfers = [], 
  isLoading, 
  session 
}) => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  
  const totalPages = Math.ceil(transfers.length / itemsPerPage);
  const paginatedTransfers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return transfers.slice(startIndex, endIndex);
  }, [currentPage, transfers]);

  
  useEffect(() => {
    setCurrentPage(1);
  }, [transfers.length]);
  
  const handleRowClick = (id) => {
    router.push(`/orders/view/${id}`);
  };
  
  const getDescription = (transfer) => {
    
    if (transfer.items && Array.isArray(transfer.items) && transfer.items.length > 0) {
      if (transfer.items.length === 1) {
        const item = transfer.items[0];
        return `${item.quantity} units of ${item.productName || 'Unknown Product'} for ${item.projectName || 'Unknown Project'}`;
      }
      return `${transfer.items.length} items (${transfer.items.reduce((sum, item) => sum + (item.quantity || 0), 0)} units total)`;
    }
    
    
    if (transfer.productId) {
      const projectName = transfer.projectName || 'Unknown Project';
      const productName = transfer.productName || 'Unknown Product';
      return `${transfer.quantity || 0} units of ${productName} for ${projectName}`;
    }
    
    
    if (transfer.type === 'in' || transfer.type === 'out') {
      const typeText = transfer.type === 'in' ? 'Stock IN' : 'Stock OUT';
      const supplier = transfer.supplierName ? ` from ${transfer.supplierName}` : '';
      const invoice = transfer.invoiceNumber ? ` (Invoice: ${transfer.invoiceNumber})` : '';
      return `${typeText}${supplier}${invoice}`;
    }
    
    return 'Transaction details unavailable';
  };

  const getStatusBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-800 bg-yellow-100 border-yellow-300">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-800 bg-green-100 border-green-300">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-800 bg-red-100 border-red-300">Rejected</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-blue-800 bg-blue-100 border-blue-300">Completed</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-800 bg-gray-100 border-gray-300">{status || 'Unknown'}</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const renderSkeletonRows = () => {
    return Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell>
          <Skeleton className="w-20 h-4" />
        </TableCell>
        <TableCell>
          <Skeleton className="w-full h-4 max-w-md" />
        </TableCell>
        <TableCell>
          <Skeleton className="w-20 h-6" />
        </TableCell>
        <TableCell>
          <Skeleton className="w-24 h-4" />
        </TableCell>
      </TableRow>
    ));
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 3; 
    
    if (totalPages <= 4) {
      
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 2) {
        
        for (let i = 1; i <= 3; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 1) {
        
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

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className='flex flex-col gap-5 pb-5'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && paginatedTransfers.length === 0 ? (
            renderSkeletonRows()
          ) : paginatedTransfers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center">
                No transfers found
              </TableCell>
            </TableRow>
          ) : (
            paginatedTransfers.map((transfer) => (
              <TableRow 
                key={transfer._id} 
                className="w-full cursor-pointer hover:bg-slate-50"
                onClick={() => handleRowClick(transfer._id)}
              >
                <TableCell className="uppercase max-w-[150px] truncate">
                  {transfer.transactionId.toString()}
                </TableCell>
                <TableCell className="max-w-[250px] truncate">
                  {getDescription(transfer)}
                </TableCell>
                <TableCell>
                  {getStatusBadge(transfer.status)}
                </TableCell>
                <TableCell>
                  {formatDate(transfer.updatedAt || transfer.createdAt)}
                </TableCell>
              </TableRow>
            ))
          )}
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
            {generatePageNumbers().map((page, index) => (
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

export default TransferTable;
