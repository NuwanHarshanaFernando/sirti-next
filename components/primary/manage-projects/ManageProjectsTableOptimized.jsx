"use client";
import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LocationEdit, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import DeleteDialog from "@/components/popups/DeleteDialog";
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

const ManageProjectsTableOptimized = () => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  
  const { data: projectsData, isLoading, refetch } = useOptimizedFetch("/api/Projects", {
    staleTime: 60000, 
    cacheKey: "manage-projects",
  });

  const manageProjects = projectsData?.projects || [];

  const handleEditProject = (projectId) => {
    router.push(`/manage-projects/edit-project?id=${projectId}`);
  };

  const handleDeleteProject = async (projectId, projectName, projectColor) => {
    setProjectToDelete({ id: projectId, name: projectName, color: projectColor });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    setDeleteLoading(true);
    setDeleteError("");

    try {
      const response = await fetch(`/api/Projects/${projectToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete project");
      }

      
      await refetch();

      
      const newTotalPages = Math.ceil((manageProjects.length - 1) / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(1);
      }

      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error("Error deleting project:", error);
      setDeleteError(error.message);
      alert(`Error deleting project: ${error.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelDeleteProject = () => {
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  
  const { paginatedProjects, totalPages } = useMemo(() => {
    const totalPages = Math.ceil(manageProjects.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = manageProjects.slice(startIndex, endIndex);

    return {
      paginatedProjects: paginated,
      totalPages,
    };
  }, [manageProjects, currentPage]);

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
    return <TableSkeleton />;
  }

  return (
    <div className="flex flex-col gap-5">
      <Table className="!rounded-xl">
        <TableHeader>
          <TableRow className="!border-black/6">
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Total Items</TableHead>
            <TableHead className="text-right">Total Stocks</TableHead>
            <TableHead className="text-right">Last Operation</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedProjects?.map((project) => (
            <TableRow key={project._id}>
              <TableCell>{project.projectId}</TableCell>
              <TableCell>
                <div className="flex flex-row items-center gap-2">
                  <ProjectBadge
                    color={project.color}
                    project={project.projectName}
                  />
                </div>
              </TableCell>
              <TableCell>{project.userCount}</TableCell>
              <TableCell>{project.productCount}</TableCell>
              <TableCell className="text-right">{project.totalItems}</TableCell>
              <TableCell className="text-right">
                {project.lastOperation}
              </TableCell>
              <TableCell className="flex flex-row items-center justify-end gap-1 text-end">
                <Button
                  variant="action"
                  actionType="edit"
                  size="actionBtn"
                  onClick={() => handleEditProject(project._id)}
                >
                  <LocationEdit />
                </Button>
                <DeleteDialog
                  open={deleteDialogOpen}
                  onOpenChange={setDeleteDialogOpen}
                  onConfirm={confirmDeleteProject}
                  onCancel={cancelDeleteProject}
                  isLoading={deleteLoading}
                  error={deleteError}
                  title="Delete Project"
                  description={`Are you sure you want to delete the project "${projectToDelete?.name}"? This action cannot be undone.`}
                  trigger={
                    <Button
                      variant="action"
                      actionType="delete"
                      size="actionBtn"
                      onClick={() =>
                        handleDeleteProject(
                          project._id,
                          project.projectName,
                          project.color
                        )
                      }
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

export default ManageProjectsTableOptimized;
