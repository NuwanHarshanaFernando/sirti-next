"use client";
import React, { useState, useMemo } from "react";
import { UserPen, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import DeleteDialog from "@/components/popups/DeleteDialog";
import { DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
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
import { TableSkeleton } from "@/components/ui/skeleton";
import useOptimizedFetch from "@/hooks/use-optimized-fetch-clean";

const ManageUsersTableOptimized = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const router = useRouter();
  const { toast } = useToast();
  const { data: usersData, isLoading, refetch } = useOptimizedFetch("/api/Users", {
    staleTime: 60000,
    cacheKey: "manage-users",
  });

  const manageUsers = usersData?.users || [];


  const { paginatedUsers, totalPages } = useMemo(() => {
    const totalPages = Math.ceil(manageUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = manageUsers.slice(startIndex, endIndex);

    return {
      paginatedUsers: paginated,
      totalPages,
    };
  }, [manageUsers, currentPage]);

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

  const handleEditUser = (userId) => {
    router.push(`/manage-users/edit-user?id=${userId}`);
  };

  const handleDeleteUser = (userId, userName) => {
    setUserToDelete({ id: userId, name: userName });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/Users/${userToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user");
      }


      await refetch();


      const newTotalPages = Math.ceil((manageUsers.length - 1) / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(1);
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteUser = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="flex flex-col gap-5">
      <Table className="!rounded-xl">
        <TableHeader>
          <TableRow className="!border-black/6">
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Project</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedUsers?.map((user) => (
            <TableRow key={user._id}>
              <TableCell>{user._id?.slice(-4) || "N/A"}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>
                <span className="capitalize">{user.role}</span>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {user.project ? (
                  <ProjectBadge
                    color={user.project.color}
                    project={user.project.name}
                  />
                ) : (
                  <span className="text-muted-foreground">No project</span>
                )}
              </TableCell>
              <TableCell className="flex flex-row items-center justify-end gap-1 text-end">
                <Button
                  variant="action"
                  actionType="edit"
                  size="actionBtn"
                  onClick={() => handleEditUser(user._id)}
                >
                  <UserPen />
                </Button>
                <DeleteDialog
                  open={deleteDialogOpen && userToDelete?.id === user._id}
                  onOpenChange={(open) => {
                    if (!open) {
                      cancelDeleteUser();
                    }
                  }}
                  onConfirm={confirmDeleteUser}
                  onCancel={cancelDeleteUser}
                  isLoading={isDeleting}
                  title="Delete User"
                  description={`Are you sure you want to delete the user "${userToDelete?.name}"? This action cannot be undone.`}
                  trigger={
                    <Button
                      variant="action"
                      actionType="delete"
                      size="actionBtn"
                      onClick={() => handleDeleteUser(user._id, user.name)}
                    >
                      <CircleX />
                    </Button>
                  }
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

export default ManageUsersTableOptimized;
