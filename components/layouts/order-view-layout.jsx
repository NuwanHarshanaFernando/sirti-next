"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CalendarDays, Package, MapPin, Hash, User, Building } from "lucide-react";
import Breadcrumb from "@/components/primary/orders/OrderBreadcrumb";

const OrderViewLayout = ({ session, id }) => {
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchTransaction();
  }, [id]);

  const fetchTransaction = async () => {
    try {
      const response = await fetch(`/api/orders/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTransaction(data);
      } else {
        toast.error("Failed to fetch order details");
      }
    } catch (error) {
      console.error("Error fetching transaction:", error);
      toast.error("Error loading order details");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    setCompleting(true);
    try {
      const response = await fetch('/api/orders/complete-with-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: id
        })
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/pdf')) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;

          const contentDisposition = response.headers.get('content-disposition');
          let filename = 'order-document.pdf';
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
            if (filenameMatch) {
              filename = filenameMatch[1];
            }
          }

          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          toast.success("Order completed successfully! PDF has been downloaded.");
        } else {
          toast.success("Order completed successfully!");
        }

        fetchTransaction();
        setTimeout(() => {
          router.push('/notifications');
        }, 2000);
      } else {
        if (response.status === 400) {
          const errorData = await response.json();
          toast.error(errorData.error || "Order cannot be completed");
        } else if (response.status === 403) {
          toast.error("Unauthorized to complete this order");
        } else if (response.status === 404) {
          toast.error("Order not found");
        } else {
          try {
            const errorData = await response.json();
            toast.error(errorData.error || "Failed to complete order");
          } catch (parseError) {
            toast.error("An unexpected error occurred");
          }
        }
      }
    } catch (error) {
      console.error("Error completing order:", error);
      toast.error("Network error occurred while completing order");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between w-full">
          <div className="layout-header">
            <h1>Order Details</h1>
            <Breadcrumb />
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-b-2 rounded-full animate-spin border-primary"></div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between w-full">
          <div className="layout-header">
            <h1>Order Details</h1>
            <Breadcrumb />
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-600">Order Not Found</h2>
            <p className="mt-2 text-gray-500">The requested order could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-700 border-yellow-200 bg-yellow-50">Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between w-full">
        <div className="layout-header">
          <h1>Order Details</h1>
          <Breadcrumb />
        </div>        <div className="flex items-center gap-2">
          {getStatusBadge(transaction.status)}
          {transaction.status === 'pending' && session?.user?.role === 'keeper' && (
            <Button
              onClick={handleCompleteOrder}
              disabled={completing}
              variant="secondary"
              size="secondary"
            >
              {completing ? 'Completing...' : 'Complete Order'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-row items-center justify-between text-black">
          <div className="flex flex-row justify-center h-full">
            <div className="flex flex-row items-start justify-between gap-10 text-sm">
              <div className="flex flex-col items-start gap-1 text-nowrap">
                <p className="flex items-start gap-1">
                  <p className="font-medium">Transaction ID:</p>
                  <p>{transaction._id}</p>
                </p>
                <p className="flex items-center gap-1">
                  <p className="font-medium">Type:</p>
                  <p >{transaction.type === 'in' ? 'Stock IN' : 'Stock OUT'}</p>
                </p>
              </div>
              <div className="flex flex-col items-start gap-1 text-nowrap">
                <p className="flex items-center gap-1">
                  <p className="font-medium">Quantity:</p>
                  <p >{transaction.items && transaction.items.length > 0 ? `${transaction.items.reduce((total, item) => total + item.quantity, 0)} units (${transaction.items.length} items)` : `${transaction.quantity} units`}</p>
                </p>
                <p className="flex items-center gap-1">
                  <p className="font-medium">Date:</p>
                  <p >{formatDate(transaction.date)}</p>
                </p>
              </div>
              <div className="flex flex-col items-start gap-1 text-nowrap">
                {transaction.invoiceNumber && (
                  <p className="flex items-center gap-1"><p className="font-medium">Invoice Number:</p>
                    <p>{transaction.invoiceNumber}</p></p>
                )}
                {transaction.supplierName && (
                  <p className="flex items-center gap-1"><p className="font-medium">Supplier:</p>
                    <p>{transaction.supplierName}</p>
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1 text-nowrap">
            <p className="flex items-center gap-1">
              <p className="font-medium">User:</p>
              <p>{transaction.createdByDetails?.name || transaction.createdByDetails?.email || 'Unknown User'}</p></p>
            <p className="flex items-center gap-1">
              <p className="font-medium">Created At:</p>
              <p>{formatDate(transaction.createdAt)}</p>
            </p>
          </div>
        </div>

        {transaction.items && transaction.items.length > 0 ? (
          <div className="">
            <h3 className="flex items-center gap-2 text-lg font-medium">
              <Package className="w-5 h-5" />
              Order Items ({transaction.items.length})
            </h3>
            {transaction.items.map((item, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    {item.productDetails?.productName || 'Loading...'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Product Code:</span>
                    <span className="text-gray-600">{item.productDetails?.productId || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Quantity:</span>
                    <span className="text-gray-600">{item.quantity} units</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Project:</span>
                    <span className="text-gray-600">{item.projectDetails?.projectName || 'Loading...'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Rack:</span>
                    <span className="text-gray-600">{item.rackDetails?.rackNumber || 'Loading...'}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Previous Stock:</span>
                    <span className="text-gray-600">{item.previousStock} units</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">New Stock:</span>
                    <span className="text-gray-600">{item.newStock} units</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Product & Location Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Product:</span>
                <span className="text-gray-600">{transaction.productDetails?.productName || 'Loading...'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Product Code:</span>
                <span className="text-gray-600">{transaction.productDetails?.code || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Project:</span>
                <span className="text-gray-600">{transaction.projectDetails?.projectName || 'Loading...'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Rack:</span>
                <span className="text-gray-600">{transaction.rackDetails?.rackNumber || 'Loading...'}</span>
              </div>
              <Separator />
              <div className="flex items-center gap-2">
                <span className="font-medium">Previous Stock:</span>
                <span className="text-gray-600">{transaction.previousStock} units</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">New Stock:</span>
                <span className="text-gray-600">{transaction.newStock} units</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OrderViewLayout;
