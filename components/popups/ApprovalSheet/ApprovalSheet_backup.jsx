import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  FolderDotIcon,
  Barcode,
  FolderPen,
  ArchiveRestore,
  MailOpen,
  ChevronRight,
  ChevronLeft,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ApprovalSheetLable from "./ApprovalSheetLable";
import ApproveTracker from "./ApproveTracker";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const ApprovalSheet = ({
  triggerText = "Open",
  pendingCount = 10,
  projectName = "Project B",
  productName = "Fiber Optic Grade A Cable",
  status = "Pending",
  statusColor = "#F9AD01",
  productDetails = {
    sku: "889540",
    name: "Fiber Optic Cable 1M",
    currentStock: "Out of Stock",
    reason: "No Stocks in Warehouse.",
  },
  trackingItems = [],
  session = null,
  requests = [],
  productId = null,
  requestType = "stock-adjustment",
  isOpen,
  onOpenChange,
  showTrigger = true,
}) => {

  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [internalSheetOpen, setInternalSheetOpen] = useState(false);

  const isSheetOpen = isOpen !== undefined ? isOpen : internalSheetOpen;
  const setIsSheetOpen = onOpenChange !== undefined ? onOpenChange : setInternalSheetOpen;

  const relevantRequests = showTrigger === false
    ? requests
    : requests.filter((req) => req.status === "pending");

  const totalRequests = relevantRequests.length;
  const getCurrentRequest = () => {
    if (relevantRequests.length === 0) return null;
    return relevantRequests[currentRequestIndex] || relevantRequests[0];
  };

  const currentRequest = getCurrentRequest();

  useEffect(() => {
    const fetchRequestData = async () => {
      if (!currentRequest) return;

      try {
        const productResponse = await fetch(
          `/api/Products/${currentRequest.productId}`
        );
        if (productResponse.ok) {
          const productData = await productResponse.json();
          setCurrentProduct(productData);
        }
        const projectResponse = await fetch(
          `/api/Projects/${currentRequest.projectId}`
        );
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          setCurrentProject(projectData);
        }
      } catch (error) {
        console.error("Error fetching request data:", error);
      }
    };

    if (currentRequest && isSheetOpen) {
      fetchRequestData();
    }
  }, [currentRequest, isSheetOpen]);

  const goToPreviousRequest = () => {
    if (currentRequestIndex > 0) {
      setCurrentRequestIndex(currentRequestIndex - 1);
    }
  };

  const goToNextRequest = () => {
    if (currentRequestIndex < totalRequests - 1) {
      setCurrentRequestIndex(currentRequestIndex + 1);
    }
  };
  const getDynamicProductDetails = () => {
    if (!currentRequest || !currentProduct) {
      return productDetails;
    }

    if (requestType === "transfer") {
      return {
        sku: currentProduct.productSKU || "Unknown SKU",
        name: currentProduct.productName || "Unknown Product",
        currentStock: `${currentRequest.quantity || 0} units requested`,
        reason: currentRequest.reason || "No reason provided",
        transferType:
          currentRequest.fromProjectId === "EXTERNAL"
            ? "Transfer In"
            : currentRequest.toProjectId === "EXTERNAL"
              ? "Transfer Out"
              : "Internal Transfer",
        project: currentProject?.projectName || "Unknown Project",
      };
    }

    return {
      sku: currentProduct.productSKU || "Unknown SKU",
      name: currentProduct.productName || "Unknown Product",
      currentStock: `${currentRequest.stockOnHand || 0} units (Requested: ${currentRequest.stockOnHold || 0
        })`,
      reason: currentRequest.reason || "No reason provided",
      rack: currentRequest.rackNumber || "No rack specified",
      project: currentProject?.projectName || "Unknown Project",
    };
  };
  const getDynamicTrackingItems = () => {
    if (!currentRequest) {
      return trackingItems.length > 0 ? trackingItems : defaultTrackingItems;
    }

    const requestDate = new Date(
      currentRequest.createdAt || currentRequest.requestedAt
    );
    const formattedDate =
      requestDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) +
      " at " +
      requestDate.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

    const requestTypeText =
      requestType === "transfer"
        ? "transfer request"
        : "stock adjustment request";
    const requestorName = currentRequest.requestedBy || "Unknown User";

    return [
      {
        status: "Pending Approval",
        dueDate: "Due Not Applicable",
        icon: User,
        iconColor: "#E27100",
      },
      {
        status: `${requestorName} created ${requestTypeText}`,
        dueDate: formattedDate,
        icon: User,
        iconColor: "#895BBA",
      },
    ];
  };

  const defaultTrackingItems = [
    {
      status: "Pending Approval",
      dueDate: "Due Not Applicable",
      icon: User,
      iconColor: "#E27100",
    },
    {
      status: "Rishzard @ Project B created request",
      dueDate: "02/06/2025 at 09:41:07",
      icon: User,
      iconColor: "#895BBA",
    },
  ];

  const finalTrackingItems =
    trackingItems.length > 0 ? trackingItems : defaultTrackingItems;
  const isAdmin = session?.user?.role === "admin"; const handleApproveRequest = async () => {
    if (!isAdmin || !currentRequest) return;

    try {
      if (requestType === "transfer" && currentRequest.productId) {
        try {
          if (currentRequest.fromProjectId !== "EXTERNAL") {
            const sourceStockResponse = await fetch(
              `/api/stock-validation?productId=${currentRequest.productId}&projectId=${currentRequest.fromProjectId}`
            );
            if (sourceStockResponse.ok) {
              const sourceData = await sourceStockResponse.json();
            }
          }

          if (currentRequest.toProjectId !== "EXTERNAL") {
            const destStockResponse = await fetch(
              `/api/stock-validation?productId=${currentRequest.productId}&projectId=${currentRequest.toProjectId}`
            );
            if (destStockResponse.ok) {
              const destData = await destStockResponse.json();
            }
          }
        } catch (stockCheckError) {
          console.warn("⚠️ Could not fetch pre-approval stock values:", stockCheckError);
        }
      }

      let response;

      if (requestType === "transfer") {
        response = await fetch("/api/transfers", {
          method: "PUT",
          headers:
          {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transferId: currentRequest._id,
            status: "approved",
            approvedBy: session?.user?.id,
          }),
        });
      } else {
        response = await fetch("/api/stock-adjustment-requests", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId: currentRequest.requestId,
            action: "approve",
          }),
        });
      }

      if (response.ok) {
        const requestTypeText =
          requestType === "transfer" ? "Transfer" : "Stock adjustment";

        if (requestType === "transfer" && currentRequest.productId) {
          await new Promise(resolve => setTimeout(resolve, 500));

          try {
            if (currentRequest.fromProjectId !== "EXTERNAL") {
              const sourceStockResponse = await fetch(
                `/api/stock-validation?productId=${currentRequest.productId}&projectId=${currentRequest.fromProjectId}`
              );
              if (sourceStockResponse.ok) {
                const sourceData = await sourceStockResponse.json();
              }
            }

            if (currentRequest.toProjectId !== "EXTERNAL") {
              const destStockResponse = await fetch(
                `/api/stock-validation?productId=${currentRequest.productId}&projectId=${currentRequest.toProjectId}`
              );
              if (destStockResponse.ok) {
                const destData = await destStockResponse.json();
              }
            }
          } catch (stockCheckError) {
            console.warn("Could not fetch post-approval stock values:", stockCheckError);
          }
        }

        toast.success(`${requestTypeText} request approved successfully!`);

        window.location.reload();

      } else {
        const data = await response.json();
        console.error("APPROVAL FAILED:", data);
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request. Please try again.");
    }
  };
  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        {showTrigger && (
          <SheetTrigger className="font-normal cursor-pointer !text-[15px] text-lemonChrome bg-lemonChrome/20 w-fit py-0.5 px-2 rounded-md ml-auto">
            {pendingCount} {triggerText}
          </SheetTrigger>
        )}
        <SheetContent className="gap-0 bg-white border-none ">
          <SheetHeader>
            <SheetTitle>
              <div className="flex flex-row items-center gap-2 pb-4 mt-5 border-b border-black/10">
                <div className="flex flex-col items-center justify-center !w-10 h-10 aspect-square rounded-full bg-[#4283DE]/10">
                  <FolderDotIcon className="w-5 h-5 stroke-[#4283DE]" />
                </div>
                <div className="flex flex-row">
                  <p className="font-normal">
                    {currentRequest?.projectName ||
                      currentProject?.projectName ||
                      projectName}
                    created {requestType === "transfer" ? "transfer" : "stock"}
                    request for
                    <span className="!text-base font-medium ml-1">
                      {currentProduct?.productName || productName}
                    </span>
                    <span
                      className="!text-xs font-medium rounded-sm px-2 py-1 ml-2"
                      style={{
                        backgroundColor: `${statusColor}10`,
                        color: statusColor,
                      }}
                    >
                      {currentRequest?.status || status}
                    </span>
                  </p>
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>
          <div>
            <div className="flex flex-col gap-2 pb-4 mx-4 border-b border-black/10">
              <ApprovalSheetLable
                label="Product SKU:"
                value={getDynamicProductDetails().sku}
                icon={Barcode}
                iconColor="#E25360"
              />
              <ApprovalSheetLable
                label="Product Name:"
                value={getDynamicProductDetails().name}
                icon={FolderPen}
                iconColor="#E76500"
              />
              {requestType === "transfer" ? (
                <ApprovalSheetLable
                  label="Transfer Type:"
                  value={getDynamicProductDetails().transferType}
                  icon={ArchiveRestore}
                  iconColor="#4283DE"
                />
              ) : (
                <ApprovalSheetLable
                  label="Rack:"
                  value={getDynamicProductDetails().rack}
                  icon={ArchiveRestore}
                  iconColor="#4283DE"
                />
              )}
              <ApprovalSheetLable
                label={
                  requestType === "transfer" ? "Quantity:" : "Current Stock:"
                }
                value={getDynamicProductDetails().currentStock}
                icon={ArchiveRestore}
                iconColor="#4283DE"
              />
              <ApprovalSheetLable
                label="Reason:"
                value={getDynamicProductDetails().reason}
                icon={MailOpen}
                iconColor="#007D51"
              />
            </div>
            <div className="flex flex-col gap-2 py-4 mx-4">
              <ApproveTracker trackingItems={getDynamicTrackingItems()} />
            </div>
          </div>
          <SheetFooter className="p-0">
            {totalRequests > 0 ? (
              <div className="flex flex-row w-full gap-0 p-0">
                <Button
                  variant="secondary"
                  className="!w-[60px] bg-amalfitanAzure/10 rounded-none"
                  type="submit"
                  onClick={goToPreviousRequest}
                  disabled={currentRequestIndex <= 0}
                  style={{
                    display: totalRequests > 1 ? "flex" : "none",
                  }}
                >
                  <ChevronLeft className="stroke-amalfitanAzure" />
                </Button>

                {isAdmin && currentRequest?.status === 'pending' ? (
                  <Button
                    className={
                      totalRequests > 1
                        ? "w-[calc(95%-120px)]"
                        : "w-full"
                    }
                    style={{ borderRadius: 0 }}
                    type="submit"
                    onClick={handleApproveRequest}
                  >
                    Approve Request
                  </Button>
                ) : (
                  <div
                    className={
                      totalRequests > 1
                        ? "w-[calc(95%-120px)]"
                        : "w-full"
                    }
                    style={{ borderRadius: 0 }}
                  >
                    <div className="w-full p-4 text-center text-gray-600 bg-gray-50">
                      Request #{currentRequestIndex + 1} of {totalRequests}
                      {currentRequest?.status === 'pending' ? ' - Pending Approval' :
                        currentRequest?.status === 'approved' ? ' - Approved' :
                          currentRequest?.status === 'rejected' ? ' - Rejected' : ''}
                    </div>
                  </div>
                )}

                <Button
                  variant="secondary"
                  className="!w-[60px] bg-amalfitanAzure/10 rounded-none"
                  type="submit"
                  onClick={goToNextRequest}
                  disabled={currentRequestIndex >= totalRequests - 1}
                  style={{
                    display: totalRequests > 1 ? "flex" : "none",
                  }}
                >
                  <ChevronRight className="stroke-amalfitanAzure" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-row w-full gap-0 p-0">
                <div className="w-full p-4 text-center text-gray-500 bg-gray-50">
                  No requests to view
                </div>
              </div>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ApprovalSheet;
