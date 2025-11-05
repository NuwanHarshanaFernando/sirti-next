"use client";
import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeftRight, CircleX, Eye } from "lucide-react";
import DeleteDialog from "@/components/popups/DeleteDialog";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { saveAs } from "file-saver";
import ExcelJS from "exceljs";
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
import TransferAssetDialog from "@/components/popups/TransferAssetDialog";
import { Pencil } from "lucide-react";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";

const AssetsManagementTable = ({ searchValue = "", selectedCategories = "", filterProjectId = "ALL", filterStatus = "ALL", filterAssignee = "ALL", currentUserId }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [assets, setAssets] = useState();
  const [holders, setHolders] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);
  const { data: session } = useSession();
  const handleDeleteAsset = async () => {
    if (!assetToDelete) return;
    try {
      await fetch(`/api/assets`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assetToDelete._id }),
      });
      await fetch(`/api/assets/assetHistory`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: assetToDelete._id }),
      });
      await fetch(`/api/assets/assetTransfers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: assetToDelete._id }),
      });
      setAssets((prev) => prev.filter((a) => a._id !== assetToDelete._id));
    } catch (err) {
      console.error("Error deleting asset and related records:", err);
    } finally {
      setDeleteDialogOpen(false);
      setAssetToDelete(null);
    }
  };
  const router = useRouter();
  

  const fetchAssets = async () => {
    try {
      const response = await fetch("/api/assets");
      if (!response.ok) {
        throw new Error("Failed to fetch assets");
      }
      const data = await response.json();
      console.log(data)
      const formattedData = data.map((asset) => ({
        ...asset,
        _id: asset._id || asset.id,
        assetSerial: asset.serialNumber || "N/A",
        assetName: asset.productName || "N/A",
        image: asset.productImage || "/images/placeholder-image.png",
        category: asset.category || "N/A",
        currentHolder: asset.assignedUserName || "N/A",
        ownerName: asset.assignedManagerName || "N/A",
        assignedManagerId: asset.assetsManager || null,
        productCode: asset.productCode || "N/A",
        projectBadge: {
          name: asset.projectName || "Unassigned",
          color: asset.projectColor || "#6B7280",
        },
        statusBadge: (asset.status || "Operational"),
        projectId: asset.projectId || null,
      }));
      setAssets(formattedData);
    } catch (error) {
      console.error("Error fetching assets:", error);
      return [];
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleEditAsset = (assetId) => {
    router.push(`/assets-management/edit-asset/${assetId}`);
  };

  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    let filtered = assets;
    const selectedCats = (selectedCategories || "").split(",").map((c) => c.trim()).filter(Boolean);
    if (selectedCats.length > 0) {
      filtered = filtered.filter(
        (asset) => selectedCats.includes(asset.category)
      );
    }
    if (filterProjectId && filterProjectId !== 'ALL') {
      filtered = filtered.filter(a => (a.projectId || "").toString() === filterProjectId.toString());
    }
    if (filterStatus && filterStatus !== 'ALL') {
      filtered = filtered.filter(a => (a.statusBadge || a.status || "").toLowerCase() === filterStatus.toLowerCase());
    }
    if (filterAssignee && filterAssignee !== 'ALL') {
      filtered = filtered.filter(a => (a.currentHolder || "").toLowerCase() === filterAssignee.toLowerCase());
    }
    if (!searchValue.trim()) return filtered;
    const lowerSearch = searchValue.trim().toLowerCase();
    return filtered.filter(
      (asset) =>
        (asset.assetName &&
          asset.assetName.toLowerCase().includes(lowerSearch)) ||
        (asset.assetSerial &&
          asset.assetSerial.toLowerCase().includes(lowerSearch))
    );
  }, [assets, searchValue, selectedCategories, filterProjectId, filterStatus, filterAssignee, currentUserId]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);

  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAssets.slice(startIndex, endIndex);
  }, [currentPage, filteredAssets]);

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

  const handleAssetClick = (asset) => {
    // Open asset view in a new tab as requested
    const url = `/assets-management/view/${asset._id}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      router.push(url);
    }
  };

  // Export helpers
  const mapRow = (asset) => ({
    ID: asset.productCode || "",
    Name: asset.assetName || "",
    "Product Value": asset.productValue || "",
    "Service Term": asset.serviceTerm || "",
    Manufacturer: asset.manufacture || "",
    Serial: asset.assetSerial || "",
    Dimensions: asset.dimensions || "",
    Weight: asset.weight || "",
    Category: asset.category || "",
    Project: asset.projectBadge?.name || "",
    "Current HOLDER": asset.currentHolder || "",
    Status: (asset.statusBadge || asset.status || "Operational"),
    "OWNER / ASSIGNEE": asset.ownerName || "",
    "Purchase Date": asset.purchaseDate || "",
    "Service Date": asset.nextServiceDate || "",

  });

  const buildWorkbook = async (rows) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Assets");
    const columns = [
      { header: "ID", key: "ID", width: 20 },
      { header: "Name", key: "Name", width: 30 },
      { header: "Product Value", key: "Product Value", width: 30 },
      { header: "Service Term", key: "Service Term", width: 30 },
      { header: "Manufacturer", key: "Manufacturer", width: 30 },
      { header: "Serial", key: "Serial", width: 30 },
      { header: "Dimensions", key: "Dimensions", width: 30 },
      { header: "Weight", key: "Weight", width: 30 },
      { header: "Category", key: "Category", width: 30 },
      { header: "Project", key: "Project", width: 25 },
      { header: "Current HOLDER", key: "Current HOLDER", width: 25 },
      { header: "Status", key: "Status", width: 18 },
      { header: "OWNER / ASSIGNEE", key: "OWNER / ASSIGNEE", width: 28 },
      { header: "Purchase Date", key: "Purchase Date", width: 30 },
      { header: "Service Date", key: "Service Date", width: 30 },
    ];
    sheet.columns = columns;
    sheet.getRow(1).font = { bold: true, size: 12 };
    sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 24;
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F7FF" } };
    rows.forEach((r) => sheet.addRow(r));
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    return workbook;
  };

  const exportFiltered = async () => {
    const rows = (filteredAssets || []).map(mapRow);
    if (!rows.length) return;
    const wb = await buildWorkbook(rows);
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    saveAs(blob, `assets-filtered-${ts}.xlsx`);
  };

  const exportAll = async () => {
    const rows = (assets || []).map(mapRow);
    if (!rows.length) return;
    const wb = await buildWorkbook(rows);
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    saveAs(blob, `assets-all-${ts}.xlsx`);
  };


  return (
    <div className="flex flex-col gap-5">
  <Table className="!rounded-xl">
        <TableHeader>
          <TableRow className="!border-black/6">
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Current HOLDER</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-left">OWNER / ASSIGNEE</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets === undefined ? (
            // Show skeleton rows while loading
            Array.from({ length: 5 }).map((_, idx) => (
              <TableRow key={idx}>
                <TableCell><Skeleton className="w-20 h-6" /></TableCell>
                <TableCell>
                  <div className="flex flex-row items-center gap-2">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <Skeleton className="w-32 h-6" />
                  </div>
                </TableCell>
                <TableCell><Skeleton className="w-24 h-6" /></TableCell>
                <TableCell><Skeleton className="w-24 h-6" /></TableCell>
                <TableCell className="flex flex-row items-center justify-end gap-1 text-start">
                  <Skeleton className="w-24 h-8" />
                </TableCell>
              </TableRow>
            ))
          ) : paginatedAssets && paginatedAssets.length > 0 ? (
            paginatedAssets.map((asset) => (
              <TableRow
                key={asset._id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleAssetClick(asset)}
              >
                <TableCell>{asset.productCode}</TableCell>
                <TableCell>
                  <div className="flex flex-row items-center gap-2">
                    <div className="flex flex-row justify-center items-center p-1.5 w-12 h-12 rounded-lg bg-black/2">
                      <img
                        src={asset.image}
                        alt={asset.assetName}
                        className="object-cover object-center"
                      />
                    </div>
                    <span title={asset.assetName || ""}>{asset.assetName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-left">
                  {asset.projectBadge?.name ? (
                    <p
                      className="px-3 py-1 text-sm font-medium uppercase rounded-lg w-fit"
                      style={{
                        backgroundColor: `${asset.projectBadge.color}1A`,
                        color: asset.projectBadge.color,
                      }}
                    >
                      {asset.projectBadge.name}
                    </p>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-md">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="flex flex-row max-w-[240px] flex-wrap items-center gap-1.5">
                  <div className="flex px-3 py-1 text-sm uppercase rounded-lg bg-accentOrange/10 text-accentOrange">
                    <p className="font-medium">{asset.currentHolder}</p>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {(() => {
                    const status = (asset.statusBadge || "Operational").toLowerCase();
                    const map = {
                      operational: { bg: "#10B9811A", fg: "#10B981", label: "Operational" },
                      "under maintain": { bg: "#F59E0B1A", fg: "#F59E0B", label: "Under Maintain" },
                      broken: { bg: "#EF44441A", fg: "#EF4444", label: "Broken" },
                      stolen: { bg: "#3B82F61A", fg: "#3B82F6", label: "Stolen" },
                    };
                    const badge = map[status] || map.operational;
                    return (
                      <p className="px-3 py-1 text-sm font-medium uppercase rounded-lg w-fit" style={{ backgroundColor: badge.bg, color: badge.fg }}>
                        {badge.label}
                      </p>
                    );
                  })()}
                </TableCell>
                <TableCell className="px-3 text-left uppercase">
                  {asset.ownerName}
                </TableCell>
                <TableCell className="flex flex-row items-center justify-end gap-1 text-end">
                  {(() => {
                    const userRole = session?.user?.role;
                    const userProjects = session?.user?.projects || session?.user?.availableProjects || [];
                    const isManager = userRole === 'manager';
                    const isAdmin = userRole === 'admin';
                    const isAssigned = Array.isArray(userProjects)
                      ? userProjects.some(p => (p?._id || p?.id || p)?.toString() === (asset.projectId || '').toString())
                      : false;
                    const canTransfer = isAdmin || (isManager && isAssigned);
                    return canTransfer ? (
                      <span onClick={(e) => e.stopPropagation()}>
                        <TransferAssetDialog
                          holders={holders}
                          setHolders={setHolders}
                          asset={asset}
                        />
                      </span>
                    ) : null;
                  })()}
                  <Button variant="action" actionType="view" size="actionBtn">
                    <Eye />
                  </Button>
                  {/* <span onClick={(e) => {
                    e.stopPropagation();
                    setAssetToDelete(asset);
                    setDeleteDialogOpen(true);
                  }}>
                    <Button variant="action" actionType="delete" size="actionBtn">
                      <CircleX />
                    </Button>
                  </span> */}
                  <span onClick={e => e.stopPropagation()}>
                    <Button
                      variant="action"
                      actionType="edit"
                      size="actionBtn"
                      onClick={() => handleEditAsset(asset._id)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </span>
        {/* Delete Dialog */}
        <DeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Are you sure you want to delete this asset?"
          description="This will permanently delete the asset and all related history and transfers. This action cannot be undone."
          confirmButtonText="Yes, Delete"
          cancelButtonText="Cancel"
          onConfirm={handleDeleteAsset}
          onCancel={() => {
            setDeleteDialogOpen(false);
            setAssetToDelete(null);
          }}
          tagText={assetToDelete?.assetName || "Asset"}
          showTag={!!assetToDelete}
        />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-gray-400">
                No assets found for this user.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="secondary">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[220px]">
            <DropdownMenuItem onClick={exportFiltered}>
              Export filtered ({filteredAssets.length})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportAll}>
              Export all ({assets ? assets.length : 0})
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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

export default AssetsManagementTable;
