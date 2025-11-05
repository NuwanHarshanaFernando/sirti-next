import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { saveAs } from "file-saver";
import ExcelJS from "exceljs";
import { Button } from "@/components/ui/button";

const ReportsTable = ({ filter, dateRange, projectId, reloadKey }) => {
  const [reports, setReports] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/reports", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Failed to fetch reports");
        const data = await response.json();
        setReports(Array.isArray(data.reports) ? data.reports : []);
      } catch {
        setReports([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [reloadKey]);


  const handleDownload = async (report) => {
    const workbook = new ExcelJS.Workbook();

    const infoColumns = [
      { header: "Report ID", key: "reportId", width: 25 },
      { header: "Type", key: "type", width: 20 },
      { header: "Remark", key: "remark", width: 40 },
      { header: "Created At", key: "createdAt", width: 25 },
      { header: "Created By", key: "createdBy", width: 25 },
    ];
    const infoSheet = workbook.addWorksheet("Report Info");
    infoSheet.columns = infoColumns;
    infoSheet.getRow(1).font = { bold: true, size: 12 };
    infoSheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
    infoSheet.getRow(1).height = 24;
    infoSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFCCE5FF" },
    };
    infoSheet.addRow({
      reportId: report.reportId || "",
      type: report.type || "",
      remark: report.remark || "",
      createdAt: report.createdAt ? new Date(report.createdAt).toLocaleString() : "",
      createdBy: report.createdBy?.name || report.createdBy || "",
    });

    let dataSheet;
    let records = [];
    let columns = [];
    if (report.type === "stock_adjustments" && Array.isArray(report.reportData.adjustments)) {
      const requiredFields = ["date", "productName", "sku", "adjustedBy", "adjustedQuantity"];
      records = report.reportData.adjustments.map(adj => {
        const filtered = {};
        requiredFields.forEach(f => { filtered[f] = adj[f] ?? ""; });
        return filtered;
      });
      columns = requiredFields.map(key => ({ header: key, key, width: 25 }));
    } else if (report.type === "qty_in_out" && Array.isArray(report.reportData.transactions)) {
      const requiredFields = ["date", "productName", "SKU", "qty_in", "qty_out", "Projects"];
      let includedProjectsMap = {};
      if (report.reportData.transactions.length > 0 && report.reportData.transactions[0].SKU) {
        if (report.reportData.includedProjects && typeof report.reportData.includedProjects === "object") {
          includedProjectsMap = report.reportData.includedProjects;
        }
      }
      records = report.reportData.transactions.map(tx => {
        const filtered = {};
        requiredFields.forEach(f => { filtered[f] = tx[f] ?? ""; });
        if (tx.SKU && includedProjectsMap[tx.SKU]) {
          filtered["Projects"] = includedProjectsMap[tx.SKU].join(", ");
        } else {
          filtered["Projects"] = "";
        }
        return filtered;
      });
      columns = requiredFields.map(key => ({ header: key, key, width: 25 }));
    } else if (report.type === "project_qty_in_out" && report.reportData.projects && typeof report.reportData.projects === "object") {
      const projectEntries = Object.entries(report.reportData.projects);
      projectEntries.forEach(([projId, projData]) => {
        const sheetName = projData.projectName?.toString().slice(0, 31) || `Project_${projId}`;
        const requiredFields = ["projectName", "productName", "sku", "qty_in", "qty_out"];
        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = requiredFields.map(key => ({ header: key, key, width: 25 }));
        sheet.getRow(1).font = { bold: true, size: 12 };
        sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
        sheet.getRow(1).height = 24;
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE6F7FF" },
        };
        (projData.rows || []).forEach(row => {
          const filtered = {};
          requiredFields.forEach(f => { filtered[f] = row[f] ?? ""; });
          sheet.addRow(filtered);
        });
        sheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: requiredFields.length },
        };
        sheet.views = [{ state: "frozen", ySplit: 1 }];
      });
      dataSheet = null;
    } else if (report.type === "total_stocks" && Array.isArray(report.reportData.totalStocks)) {
      const requiredFields = ["projectName", "manager", "racksCount", "availableStocks"];
      const sheet = workbook.addWorksheet("Total Stocks Summary");
      sheet.columns = requiredFields.map(key => ({ header: key, key, width: 25 }));
      sheet.getRow(1).font = { bold: true, size: 12 };
      sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
      sheet.getRow(1).height = 24;
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE6F7FF" },
      };
      report.reportData.totalStocks.forEach(row => {
        const filtered = {};
        requiredFields.forEach(f => { filtered[f] = row[f] ?? ""; });
        sheet.addRow(filtered);
      });
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: requiredFields.length },
      };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      dataSheet = null;
    } else if (report.type === "non_moving_items" && Array.isArray(report.reportData.nonMovingProducts)) {
      const requiredFields = ["productName", "SKU", "currentStock"];
      records = report.reportData.nonMovingProducts.map(item => {
        const filtered = {};
        requiredFields.forEach(f => { filtered[f] = item[f] ?? ""; });
        return filtered;
      });
      columns = requiredFields.map(key => ({ header: key, key, width: 25 }));
    }
    if (records.length > 0 && columns.length > 0) {
      dataSheet = workbook.addWorksheet("Report Data");
      dataSheet.columns = columns;
      dataSheet.getRow(1).font = { bold: true, size: 12 };
      dataSheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
      dataSheet.getRow(1).height = 24;
      dataSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE6F7FF" },
      };
      records.forEach((rec) => {
        const flatRec = {};
        Object.entries(rec).forEach(([k, v]) => {
          flatRec[k] = typeof v === "object" && v !== null ? JSON.stringify(v) : v;
        });
        dataSheet.addRow(flatRec);
      });
      dataSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length },
      };
      dataSheet.views = [{ state: "frozen", ySplit: 1 }];
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([
      buffer,
    ], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `${report.reportId || "report"}.xlsx`);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [reports]);


  return (
    <div className="flex flex-col gap-5">
      <Table className="!rounded-xl">
        <TableHeader>
          <TableRow className="!border-black/6">
            <TableHead className="w-[300px]">Date</TableHead>
            <TableHead className="text-left">Remark</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center">
                No reports found
              </TableCell>
            </TableRow>
          ) : (
            reports
              .slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage
              )
              .map((report, index) => (
                <TableRow key={report._id || index}>
                  <TableCell>
                    {report.createdAt
                      ? new Date(report.createdAt).toLocaleString()
                      : ""}
                  </TableCell>
                  <TableCell className="text-left">{report.remark}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="secondary"
                      size="secondary"
                      onClick={() => handleDownload(report)}
                    >
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-center">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setCurrentPage(
                    Math.min(
                      Math.ceil(reports.length / itemsPerPage),
                      currentPage + 1
                    )
                  )
                }
                className={
                  currentPage === Math.ceil(reports.length / itemsPerPage)
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};

export default ReportsTable;
