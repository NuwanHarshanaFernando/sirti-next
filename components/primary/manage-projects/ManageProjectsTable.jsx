"use client";
import React, { useState, useMemo, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";

const ManageProjectsTable = ({ loading }) => {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;  const [manageProjects, setManageProjects] = useState();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const handleEditProject = (projectId) => {
    router.push(`/manage-projects/edit-project?id=${projectId}`);
  };  const handleDeleteProject = async (projectId, projectName, projectColor) => {
    setProjectToDelete({ id: projectId, name: projectName, color: projectColor });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    setDeleteLoading(true);
    setDeleteError("");

    try {
      // Remove project from all users' availaleProjects before deleting
      try {
        await fetch('/api/Users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ removeProjectId: projectToDelete.id })
        });
      } catch (userUpdateErr) {
        console.error('Error removing project from users:', userUpdateErr);
      }

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

      const refreshResponse = await fetch("/api/Projects", { cache: "no-store" });
      const refreshData = await refreshResponse.json();
      const filtered = Array.isArray(refreshData.projects)
        ? refreshData.projects.filter(p => !p.isLobby && !/lobby/i.test(p?.projectName || ""))
        : [];
      setManageProjects(filtered);

      const newTotalPages = Math.ceil(filtered.length / itemsPerPage);
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

  const totalPages = Math.ceil(manageProjects?.length / itemsPerPage);

  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return manageProjects?.slice(startIndex, endIndex);
  }, [currentPage, manageProjects]);

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
      const response = await fetch("/api/Projects", { cache: "no-store" });
      const data = await response.json();
      // Hide Lobby projects from the list
      const filtered = Array.isArray(data.projects)
        ? data.projects.filter(p => !p.isLobby && !/lobby/i.test(p?.projectName || ""))
        : [];
      setManageProjects(filtered);
    };
    fetchUsers();
  }, []);

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
          {loading
            ? [...Array(5)].map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton className="w-16 h-5" /></TableCell>
                  <TableCell><Skeleton className="w-32 h-5" /></TableCell>
                  <TableCell><Skeleton className="w-16 h-5" /></TableCell>
                  <TableCell><Skeleton className="w-16 h-5" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="w-16 h-5" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="w-24 h-5" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="w-20 h-8" /></TableCell>
                </TableRow>
              ))
            : paginatedProjects?.map((project) => (
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
                      title="Are You Sure Want to Delete?"
                      description={`This will permanently delete the project "${projectToDelete?.name}". This action cannot be undone!`}
                      tagText={projectToDelete?.name}
                      accentColor={projectToDelete?.color || "#dc2626"}
                      confirmButtonText="Yes, Delete Project"
                      cancelButtonText="Cancel"
                      onConfirm={confirmDeleteProject}
                      onCancel={cancelDeleteProject}
                      triggerElement={
                        <Button 
                          variant="action" 
                          actionType="delete" 
                          size="actionBtn"
                          onClick={() => handleDeleteProject(project._id, project.projectName, project.color)}
                          disabled={deleteLoading}
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

export default ManageProjectsTable;
