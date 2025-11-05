"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";

import { useSession } from "next-auth/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Loader2, FileDown, Barcode } from "lucide-react";
import PrimaryBreadcrumb from "@/components/primary/orders/PrimaryBreadcrumb";
import { generateAndDownloadBarcode } from "@/lib/barcode-generator";

export default function OrderDetailPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const { data: session, status } = useSession();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [transcationId, setTransactionId] = useState();

  useEffect(() => {
    if (session) {
      fetchOrderDetails();
    }
  }, [session, id]);

  const fetchOrderDetails = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/stock-management/${id}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch order details");
      }

      const data = await response.json();
      setOrder(data.transaction);
      setTransactionId(data.transaction.transactionId);
    } catch (error) {
      toast.error("Failed to fetch order details");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePDF = async (viewInBrowser = false) => {
    if (viewInBrowser) {
      setIsViewing(true);
    } else {
      setIsDownloading(true);
    }

    try {
      const apiUrl = viewInBrowser
        ? `/api/orders/download-pdf/${id}?display=inline`
        : `/api/orders/download-pdf/${id}`;

      const response = await fetch(apiUrl, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      if (viewInBrowser) {
        window.open(url, "_blank");
        toast.success("PDF opened in new tab");
        setTimeout(() => window.URL.revokeObjectURL(url), 60000); // Clean up after 1 minute
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${transcationId}.pdf`;
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
        toast.success("PDF downloaded successfully");
      }
    } catch (error) {
      toast.error(`Failed to ${viewInBrowser ? "view" : "download"} PDF`);
    } finally {
      if (viewInBrowser) {
        setIsViewing(false);
      } else {
        setIsDownloading(false);
      }
    }
  };

  const viewPDF = () => handlePDF(true);
  const downloadPDF = () => handlePDF(false);

  const handleDownloadBarcode = () => {
    if (!transcationId) return;
    try {
      generateAndDownloadBarcode(transcationId);
      toast.success("Barcode downloaded successfully");
    } catch (error) {
      toast.error("Failed to download barcode");
    }
  };

  const handleCompleteOrder = async () => {
    setIsCompleting(true);
    try {
      const response = await fetch(`/api/orders/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactionId: id }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete order");
      }

      const result = await response.json();
      toast.success("Order completed successfully");

      await fetchOrderDetails();
    } catch (error) {
      toast.error("Failed to complete order");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!id || isCancelling) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/stock-management/cancel/${id}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to cancel");
      toast.success(data?.message || "Cancelled successfully");
      await fetchOrderDetails();
    } catch (e) {
      toast.error(e.message || "Failed to cancel");
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="text-yellow-800 bg-yellow-100 border-yellow-300"
          >
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="text-green-800 bg-green-100 border-green-300"
          >
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="text-red-800 bg-red-100 border-red-300"
          >
            Rejected
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="text-blue-800 bg-blue-100 border-blue-300"
          >
            Completed
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="text-gray-800 bg-gray-100 border-gray-300"
          >
            {status || "Unknown"}
          </Badge>
        );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";

    try {
      const date = new Date(dateString);
      return format(date, "PPpp");
    } catch (error) {
      return "Invalid date";
    }
  };

  const getTransactionType = (order) => {
    if (!order) return "Unknown";

    if (order.type === "in") {
      return "Stock IN";
    } else if (order.type === "out") {
      return "Stock OUT";
    } else if (order.transferType) {
      return `Transfer (${order.transferType})`;
    } else if (order.isOrderMode) {
      return "Order Request";
    }

    return "Transaction";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col w-full px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 mr-2 text-gray-500 animate-spin" />
          <span>Loading order details...</span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col w-full px-4 py-6">
        <div
          title="Order Not Found"
          subtitle="The requested order could not be found"
        />
      </div>
    );
  }

  const hasMultipleItems =
    order.items && Array.isArray(order.items) && order.items.length > 0;

  const orderItems = hasMultipleItems
    ? order.items
    : order.productId
      ? [
        {
          productId: order.productId,
          productName: order.productName || "Unknown Product",
          quantity: order.quantity || 0,
          projectId: order.projectId,
          projectName: order.projectName || "Unknown Project",
          rackId: order.rackId,
          rackNumber: order.rackNumber || "Unknown Rack",
          previousStock: order.previousStock,
          newStock: order.newStock,
        },
      ]
      : [];

  return (
    <div className="flex flex-col w-full gap-6 px-4">
      <div className="flex flex-row items-start justify-between w-full">
        <div className="layout-header">
          <h1>Transfers</h1>
          <PrimaryBreadcrumb
            orderId={order._id}
            transactionType={getTransactionType(order)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadBarcode}
            disabled={!transcationId || isLoading}
            variant="secondary"
          >
            <Barcode className="w-4 h-4 mr-1" />
            Download Barcode
          </Button>
          {order.status !== "cancelled" && (
            <Button
              onClick={handleCancelOrder}
              variant="outline"
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <svg
                    className="mr-3 -ml-1 text-amalfitanAzure size-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Cancelling...
                </>
              ) : (
                "Cancel"
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-row justify-between gap-4">
        <Card className="w-full p-4 shadow-none">
          <h3 className="text-lg font-medium">Transaction Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <p className="font-medium">Type:</p>
              <p>{getTransactionType(order)}</p>
            </div>
            <div className="flex justify-between">
              <p className="font-medium">Status:</p>
              <p>{getStatusBadge(order.status)}</p>
            </div>
            <div className="flex justify-between">
              <p className="font-medium">Created:</p>
              <p>{formatDate(order.createdAt)}</p>
            </div>
            <div className="flex justify-between">
              <p className="font-medium">Last Updated:</p>
              <p>{formatDate(order.updatedAt || order.createdAt)}</p>
            </div>
          </div>
        </Card>
        <Card className="w-full p-4 shadow-none">
          <h3 className="text-lg font-medium">Additional Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <p className="font-medium">Invoice Number:</p>
              <p>{order.invoiceNumber || "N/A"}</p>
            </div>
            <div className="flex justify-between">
              <p className="font-medium">Supplier:</p>
              <p>{order.supplierName || "N/A"}</p>
            </div>
            <div className="flex justify-between">
              <p className="font-medium">Created By:</p>
              <p>{order.createdByName || order.createdBy || "System"}</p>
            </div>
            <div className="flex justify-between">
              <p className="font-medium">Total Items:</p>
              <p>{orderItems.length} items</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Rack</TableHead>
              {(order.type === "in" || order.type === "out") && (
                <>
                  <TableHead>Previous Stock</TableHead>
                  <TableHead>New Stock</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={order.type === "in" || order.type === "out" ? 6 : 4}
                  className="py-4 text-center"
                >
                  No items in this transaction
                </TableCell>
              </TableRow>
            ) : (
              orderItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.productName || "Unknown Product"}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.projectName || "Unknown Project"}</TableCell>
                  <TableCell>{item.rackNumber || "Unknown Rack"}</TableCell>
                  {(order.type === "in" || order.type === "out") && (
                    <>
                      <TableCell>{item.previousStock != null ? item.previousStock : "N/A"}</TableCell>
                      <TableCell>{item.newStock != null ? item.newStock : "N/A"}</TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )
            }
          </TableBody>
        </Table>
      </Card>

      {order.message && (
        <Card className="gap-2 p-4 shadow-none">
          <h3 className="!text-base !font-normal uppercase">Additional Message</h3>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {order.message}
          </div>
        </Card>
      )}

      {order.status === "pending" && session?.user?.role === "keeper" && (
        <div className="flex space-x-4">
          <Button
            onClick={handleCompleteOrder}
            disabled={isCompleting}
            variant="secondary"
            size="secondary"
          >
            {isCompleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Completing...
              </>
            ) : (
              "Complete Order"
            )}
          </Button>
          <Button
            onClick={handleCancelOrder}
            disabled={isCompleting || isCancelling}
            variant="destructive"
            size="secondary"
          >
            {isCancelling ? (
              <>
                <svg
                  className="mr-3 -ml-1 text-amalfitanAzure size-5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </>
            ) : (
              "Cancel Order"
            )}
          </Button>
        </div>
      )}

      {order.status === "completed" && (
        <div className="flex space-x-4">
          <Button
            onClick={downloadPDF}
            disabled={isDownloading || isViewing}
            variant="secondary"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-1" />
            )}
            {isDownloading ? "Downloading..." : "Download PDF"}
          </Button>
          <Button
            onClick={viewPDF}
            disabled={isDownloading || isViewing}
            variant="outline"
          >
            {isViewing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
            {isViewing ? "Opening..." : "View PDF"}
          </Button>
        </div>
      )}
    </div>
  );
}
