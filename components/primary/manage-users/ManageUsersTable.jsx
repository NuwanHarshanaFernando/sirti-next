"use client";
import React, { useState, useMemo, useEffect } from "react";
import { UserPen, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import DeleteDialog from "@/components/popups/DeleteDialog";
import { DialogTrigger } from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
const ManageUsersTable = ({ isParentLoading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [manageUsers, setManageUsers] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const totalPages = Math.ceil(manageUsers?.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    if (!manageUsers || manageUsers.length === 0) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return manageUsers?.slice(startIndex, endIndex);
  }, [currentPage, manageUsers]);

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
    fetchUsers();
  }, []); const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/Users", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data.users)) {
        setManageUsers(data.users);
      } else {
        setManageUsers([]);
      }
    } catch (error) {
      toast.error("Failed to fetch users");
      setManageUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    setIsDeleting(true);
    try {
      // Remove user from all projects' users array before deleting (bulk)
      try {
        const allProjectsRes = await fetch('/api/Projects');
        const allProjectsData = await allProjectsRes.json();
        if (allProjectsRes.ok && allProjectsData.projects) {
          const userIdStr = String(userId);
          // Find all project IDs where user is present
          const removeFromProjects = allProjectsData.projects
            .filter(project => {
              const usersArr = Array.isArray(project.users)
                ? project.users.map(u => (u && u.toString ? u.toString() : String(u)))
                : [];
              return usersArr.includes(userIdStr);
            })
            .map(project => project._id);
          if (removeFromProjects.length > 0) {
            await fetch('/api/Projects', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: userIdStr, removeFromProjects })
            });
          }
        }
      } catch (projErr) {
        console.error('Error removing user from projects:', projErr);
      }

      // Now delete the user
      const response = await fetch(`/api/Users?userId=${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchUsers();
        const newTotalPages = Math.ceil(
          (manageUsers.length - 1) / itemsPerPage
        );
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        }
        toast.success(`User "${userName}" has been deleted successfully.`);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to delete user: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      toast.error(`Failed to delete user: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  function formatDate(dateStr) {
    const date = new Date(dateStr);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const amPm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12 || 12;

    return `${year}/${month}/${day} ${String(hours).padStart(
      2,
      "0"
    )}:${minutes}:${seconds} ${amPm}`;
  }



  return (
    <div className="flex flex-col gap-5">
      <Table className="!rounded-xl">
        <TableHeader>
          <TableRow className="!border-black/6">
            <TableHead className="w-[100px]">UID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>PROJECTS</TableHead>
            <TableHead className="text-right">Contact</TableHead>
            <TableHead className="text-right">Last Login</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isParentLoading || isLoading ? (
            Array.from({ length: itemsPerPage }).map((_, index) => (
              <TableRow key={index}>
                <TableCell colSpan={6} className="py-2 text-center">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-5" />
                    <Skeleton className="w-32 h-5" />
                    <Skeleton className="w-48 h-5" />
                    <Skeleton className="w-24 h-5 ml-auto" />
                    <Skeleton className="h-5 ml-auto w-36" />
                    <Skeleton className="w-24 h-8 ml-auto" />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : paginatedUsers && paginatedUsers.length > 0 ? (
            paginatedUsers.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{String(user._id).slice(0, 5)}</TableCell>
                <TableCell>
                  <div className="flex flex-row items-center gap-2">
                    {user.name || 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="flex flex-row max-w-[240px] flex-wrap items-center gap-1.5">
                  {user.availableProjects && user.availableProjects.length > 0 ? (
                    user.availableProjects.map((project, index) => (
                      <ProjectBadge
                        key={index}
                        color={project.color}
                        project={project.projectName}
                      />
                    ))
                  ) : (
                    <p className="text-gray-500 uppercase">No projects</p>
                  )}
                </TableCell>
                <TableCell className="text-right">{user.contact || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  {user.lastAccessed ? formatDate(user.lastAccessed) : 'Never'}
                </TableCell>
                <TableCell className="flex flex-row items-center justify-end gap-1 text-end">
                  <Button
                    variant="action"
                    actionType="edit"
                    size="actionBtn"
                    onClick={() =>
                      router.push(`/manage-users/edit-user?userId=${user._id}`)
                    }
                  >
                    <UserPen />
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
                    title="Delete User"
                    description={`Are you sure you want to delete "${user.name || 'this user'}"? This action cannot be undone.`}
                    confirmButtonText={isDeleting ? "Deleting..." : "Delete"}
                    cancelButtonText="Cancel" onConfirm={() => handleDeleteUser(user._id, user.name)}
                    onCancel={() => { }}
                    showTag={false}
                  />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center">
                <span className="text-gray-500">No users found</span>
              </TableCell>
            </TableRow>
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

export default ManageUsersTable;
