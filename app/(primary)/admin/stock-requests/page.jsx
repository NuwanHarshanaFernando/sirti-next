"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import { toast } from "sonner";

const AdminStockRequestsPage = () => {
  const { data: session } = useSession();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchRequests();
    }
  }, [session]);

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/stock-adjustment-requests?role=admin");
      const data = await response.json();

      if (response.ok) {
        setRequests(data.requests || []);
      }
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (requestId, action) => {
    try {
      const response = await fetch("/api/stock-adjustment-requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: requestId,
          action: action,
        }),
      });

      if (response.ok) {
        toast.success(`Request ${action}d successfully!`);
        fetchRequests();
      } else {
        const data = await response.json();
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {

      toast.error("Failed to process request. Please try again.");
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };

    const colors = {
      pending: "#E27100",
      approved: "#008919",
      rejected: "#DC2626",
    };

    return (
      <Badge
        variant={variants[status]}
        style={{
          backgroundColor: `${colors[status]}20`,
          color: colors[status],
        }}
      >
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (session?.user?.role !== "admin") {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p>Only administrators can access this page.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading requests...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Stock Adjustment Requests</h1>
        <p className="text-gray-600">
          Manage and approve stock adjustment requests from managers
        </p>
      </div>

      <div className="bg-white border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Rack</TableHead>
              <TableHead>Stock On Hand</TableHead>
              <TableHead>Stock On Hold</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-8 text-center text-gray-500"
                >
                  No stock adjustment requests found
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request._id}>
                  <TableCell className="font-mono text-sm">
                    {request.requestId}
                  </TableCell>
                  <TableCell>{request.projectName}</TableCell>
                  <TableCell>{request.rackNumber}</TableCell>
                  <TableCell>{formatNumber(request.stockOnHand)}</TableCell>
                  <TableCell>{formatNumber(request.stockOnHold)}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {request.reason}
                  </TableCell>
                  <TableCell>{request.requestedBy}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    {request.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleApproval(request.requestId, "approve")
                          }
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleApproval(request.requestId, "reject")
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {request.status === "approved"
                          ? "Approved"
                          : "Rejected"}
                        {request.approvedBy && (
                          <span className="block text-xs">
                            by {request.approvedBy}
                          </span>
                        )}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminStockRequestsPage;
