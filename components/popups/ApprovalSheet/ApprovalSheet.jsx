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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { se } from "date-fns/locale";

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
  showTrigger = true
}) => {

  const fetchUserName = async (userId) => {
    if (!userId) return "System";
    if (typeof userId === 'string' && userId.includes('@')) return userId;
    if (userLookup[userId]) return userLookup[userId];
    try {
      const response = await fetch(`/api/Users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        const userName = userData.user?.name || userData.user?.email || userData.name || userData.email;
        setUserLookup(prev => ({ ...prev, [userId]: userName }));
        return userName;
      }
    } catch (error) {
    }
    if (typeof userId === 'string' && /^[0-9a-f]{24}$/i.test(userId)) {
      return `User ${userId.substring(0, 4)}...${userId.substring(20)}`;
    }
    return String(userId);
  };

  const formatUserId = (userId) => {
    if (!userId) return "System";

    if (typeof userId === 'string' && userId.includes('@')) {
      return userId;
    }

    if (userLookup[userId]) {
      return userLookup[userId];
    }

    if (typeof userId === 'string' && /^[0-9a-f]{24}$/i.test(userId)) {
      return `User ${userId.substring(0, 4)}...${userId.substring(20)}`;
    }

    return String(userId);
  };

  const hasAccessToProject = (projectId) => {
    if (!session?.user || !projectId) {
      return false;
    }

    if (session.user.role === 'admin') {
      return true;
    }


    const userProjects = [];

    if (session.user.availableProjects && Array.isArray(session.user.availableProjects)) {
      session.user.availableProjects.forEach((p, index) => {
        if (typeof p === 'object' && p !== null && p._id) {
          userProjects.push(p._id.toString());
        } else if (typeof p === 'object' && p !== null && p.id) {
          userProjects.push(p.id.toString());
        } else if (typeof p === 'string') {
          userProjects.push(p);
        } else if (p) {
          userProjects.push(p.toString());
        }
      });
    }

    if (session.user.assignedProject) {
      const assignedProjectId = typeof session.user.assignedProject === 'object'
        ? (session.user.assignedProject._id?.toString() || session.user.assignedProject.id?.toString())
        : session.user.assignedProject.toString();

      if (assignedProjectId && !userProjects.includes(assignedProjectId)) {
        userProjects.push(assignedProjectId);
      }
    }

    if (session.user.projects && Array.isArray(session.user.projects)) {
      session.user.projects.forEach((p, index) => {
        if (typeof p === 'object' && p !== null && p._id) {
          userProjects.push(p._id.toString());
        } else if (typeof p === 'object' && p !== null && p.id) {
          userProjects.push(p.id.toString());
        } else if (typeof p === 'string') {
          userProjects.push(p);
        } else if (p) {
          userProjects.push(p.toString());
        }
      });
    }

    const hasAccess = userProjects.includes(projectId.toString());

    return hasAccess;
  };

  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const [internalSheetOpen, setInternalSheetOpen] = useState(false);
  const [destinationRacks, setDestinationRacks] = useState([]);
  const [selectedDestinationRack, setSelectedDestinationRack] = useState("");
  const [loadingDestinationRacks, setLoadingDestinationRacks] = useState(false);
  const [isCompletingTransfer, setIsCompletingTransfer] = useState(false);
  const [userLookup, setUserLookup] = useState({});
  const [approvedQtyInput, setApprovedQtyInput] = useState("");

  const isSheetOpen = isOpen !== undefined ? isOpen : internalSheetOpen;
  const setIsSheetOpen =
    onOpenChange !== undefined ? onOpenChange : setInternalSheetOpen;
  const relevantRequests =
    showTrigger === false
      ? requests
      : requestType === "transfer"
        ? session?.user?.role === "admin"
          ? requests.filter((req) => req.status === "pending") 
          : requests.filter((req) => req.status === "approved") 
        : requests.filter((req) => req.status === "pending"); 
  const totalRequests = relevantRequests.length;

  const getCurrentRequest = () => {
    if (relevantRequests.length === 0) return null;
    return relevantRequests[currentRequestIndex] || relevantRequests[0];
  };

  const currentRequest = getCurrentRequest();

  useEffect(() => {
    if (!currentRequest) return;
    const userFields = ['requestedBy', 'approvedBy', 'completedBy'];
    userFields.forEach((field) => {
      const id = currentRequest[field];
      if (id && !userLookup[id] && !(typeof id === 'string' && id.includes('@'))) {
        fetchUserName(id);
      }
    });
  }, [currentRequest, userLookup, fetchUserName]);




  useEffect(() => {
    if (
      currentRequest &&
      requestType === "transfer" &&
      currentRequest.status === "approved" &&
      currentRequest.toProjectId &&
      currentRequest.toProjectId !== "EXTERNAL" &&
      currentRequest.productId &&
      isSheetOpen
    ) {
      fetchDestinationRacksFromProject(currentRequest);
    }
  }, [currentRequest, isSheetOpen, requestType, session]);

 

  const fetchDestinationRacksFromProject = async (request) => {
    if (!request.toProjectId || request.toProjectId === "EXTERNAL") {
      setDestinationRacks([]);
      return;
    }
    const destinationProjectId = request.toProjectId?.toString?.() || request.toProjectId;
    const sourceProjectId = request.fromProjectId?.toString?.() || request.fromProjectId;
    const isTransferIn = request.transferType === "IN";
    const userHasAccessToDestination = hasAccessToProject(destinationProjectId);
    const userHasAccessToSource = sourceProjectId !== "EXTERNAL" ? hasAccessToProject(sourceProjectId) : false;
    const isLikelyTransferIn = userHasAccessToDestination && !userHasAccessToSource;

    const isApprovedTransferAwaitingCompletion =
      request.status === "approved" &&
      request.toRack &&
      request.transferType === "OUT" &&
      (session?.user?.role === "manager" || session?.user?.role === "keeper");

    const shouldAllowAccess = isTransferIn || isLikelyTransferIn || isApprovedTransferAwaitingCompletion;
    const isTransferInRackSelection = isTransferIn  || isApprovedTransferAwaitingCompletion;
    const isTransferOutScenario = !isTransferInRackSelection && userHasAccessToSource;

    const isTransferOutCompletionByManager =
      request.transferType === "OUT" &&
      request.status === "approved" &&
      (session?.user?.role === "manager") &&
      !userHasAccessToSource &&
      !userHasAccessToDestination;

    if (!shouldAllowAccess && !isTransferOutScenario && !isTransferOutCompletionByManager) {
      setDestinationRacks([]);
      return;
    }

    if (shouldAllowAccess) {
      if (isApprovedTransferAwaitingCompletion) {
      } else {
      }
    } else if (isTransferOutScenario) {
    } else if (isTransferOutCompletionByManager) {
    }

    setLoadingDestinationRacks(true);
    setDestinationRacks([]);

    try {
      let projectToFetchRacksFrom;

      if (isTransferInRackSelection) {
        projectToFetchRacksFrom = sourceProjectId;
      } else {
        projectToFetchRacksFrom = destinationProjectId;
      }
      const projectId = projectToFetchRacksFrom?.toString?.() || projectToFetchRacksFrom;
      let projectToUse = projectId;

      const response = await fetch(`/api/Racks?projectId=${projectToUse}`);

      if (!response.ok) {
        setDestinationRacks([]);
        return;
      }

      const data = await response.json();
      if (data.racks && Array.isArray(data.racks) && data.racks.length > 0) {
        const rackOptions = data.racks.map((rack) => ({
          value: rack.rackNumber,
          label: rack.rackNumber,
          id: rack._id,
        }));
        setDestinationRacks(rackOptions);
      } else {
        setDestinationRacks([]);
      }
    } catch (error) {
      setDestinationRacks([]);
    } finally {
      setLoadingDestinationRacks(false);
    }
  };

  const handleCompleteTransfer = async () => {
    if (!currentRequest || !selectedDestinationRack) {
      toast.error("Please select a destination rack to complete the transfer.");
      return;
    }

    const destinationProjectId = currentRequest.toProjectId?.toString?.() || currentRequest.toProjectId;
    const sourceProjectId = currentRequest.fromProjectId?.toString?.() || currentRequest.fromProjectId;
    const isTransferIn = currentRequest.transferType === "IN";

    const userHasAccessToDestination = hasAccessToProject(destinationProjectId);
    const userHasAccessToSource = sourceProjectId !== "EXTERNAL" ? hasAccessToProject(sourceProjectId) : false;
    const isLikelyTransferIn = userHasAccessToDestination && !userHasAccessToSource;
    const isSourceManagerCompletingOut = userHasAccessToSource && !userHasAccessToDestination;

    const isTransferOutCompletionByManager =
      currentRequest.transferType === "OUT" &&
      currentRequest.status === "approved" &&
      (session?.user?.role === "manager") &&
      !userHasAccessToSource &&
      !userHasAccessToDestination;

      const isTransferOutCompletionByKeeper = currentRequest.transferType === "OUT" &&
      currentRequest.status === "approved" &&
      (session?.user?.role === "keeper") ;
      

      
    const shouldAllowCompletion = isTransferIn || isSourceManagerCompletingOut ||
      userHasAccessToDestination || userHasAccessToSource || isTransferOutCompletionByManager||isTransferOutCompletionByKeeper;

    if (!shouldAllowCompletion) {
      toast.error("You don't have permission to complete this transfer.");
      return;
    }
    if (isTransferIn) {
    } else if (isSourceManagerCompletingOut) {
    } else if (isTransferOutCompletionByManager) {
    } else {
    }

    setIsCompletingTransfer(true);

    try {
      const isTransferInCompletion = isTransferIn ||
        (
          currentRequest.status === "approved" &&
          currentRequest.toRack &&
          currentRequest.transferType === "OUT" &&
          (session?.user?.role === "manager" || session?.user?.role === "keeper")
        );
      const requestBody = {
        transferId: currentRequest._id,
        action: "complete",
        completedBy: session?.user?.id,
        completedByName: session?.user?.name || session?.user?.email || "Unknown User",
      };

      if (isTransferInCompletion) {
        // For transfer IN completion, the selected rack represents the source rack to pull from
        requestBody.sourceRack = selectedDestinationRack;
      } else {
        // For transfer OUT completion by source-side manager/keeper, select destination rack
        requestBody.destinationRack = selectedDestinationRack;
        requestBody.sourceRack = currentRequest.fromRack || "";
      }

      const response = await fetch("/api/transfers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        toast.success(
          "Transfer completed successfully! Stock has been moved to the selected rack."
        );

        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: "Failed to complete transfer" };
        }
        toast.error(`Error: ${errorData.error || "Failed to complete transfer"}`);
      }
    } catch (error) {
      toast.error("Failed to complete transfer. Please try again.");
    } finally {
      setIsCompletingTransfer(false);
    }
  };

  const maxRequestQty = (() => {
    const req = getCurrentRequest();
    return req && Number.isFinite(Number(req?.quantity)) ? Number(req.quantity) : 0;
  })();

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

    if (currentRequest.status === "completed" && showTrigger === false) {
      return {
        sku:
          currentProduct.productId ||
          currentRequest.code ||
          "Unknown SKU",
        name:
          currentProduct.productName ||
          currentRequest.productName ||
          currentRequest.entityName ||
          "Unknown Product",
        currentStock: currentRequest.quantity
          ? `${currentRequest.quantity} units affected`
          : `Activity completed`,
        reason:
          currentRequest.reason || currentRequest.remark || "System activity",
        activityType:
          currentRequest.metadata?.activityType ||
          currentRequest.type ||
          "Activity",
        completedBy:
          currentRequest.createdBy ||
          currentRequest.completedByName ||
          userLookup[currentRequest.completedBy] ||
          currentRequest.requestedByName ||
          userLookup[currentRequest.requestedBy] ||
          currentRequest.approvedByName ||
          userLookup[currentRequest.approvedBy] ||
          currentRequest.userName ||
          currentRequest.userEmail ||
          "System",
        completedAt: currentRequest.completedAt || currentRequest.timestamp || currentRequest.updatedAt,
        project:
          currentProject?.projectName ||
          currentRequest.projectName ||
          "Unknown Project",
      };
    }

    if (requestType === "product_update") {
      const updatedBy = currentRequest.userName || currentRequest.userEmail || "System User";
      let timestamp;
      try {
        if (currentRequest.timestamp) {
          timestamp = new Date(currentRequest.timestamp).toLocaleString();
        } else if (currentRequest.createdAt) {
          timestamp = new Date(currentRequest.createdAt).toLocaleString();
        } else {
          timestamp = "Unknown Date";
        }
      } catch (err) {
        console.error("Error formatting date:", err);
        timestamp = "Date Format Error";
      }

      const result = {
        sku: currentProduct?.productId || currentRequest.productCode || currentRequest.code || "Unknown SKU",
        name: currentProduct?.productName || currentRequest.productName || currentRequest.entityName || "Unknown Product",
        activityType: "Product Update",
        timestamp: timestamp,
        updatedBy: updatedBy,
        reason: currentRequest.reason || currentRequest.message || "Product information updated",
        changes: extractProductUpdateChanges(currentRequest)
      };

      return result;
    }

    if (requestType === "transfer") {
      return {
        sku: currentProduct.productId || "Unknown SKU",
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

    if (requestType === "activity") {
      return {
        sku: currentProduct?.productId || "Unknown SKU",
        name: currentProduct?.productName || currentRequest.productName || "Unknown Product",
        currentStock: `${currentRequest.quantity || 0} units ${currentRequest.transactionType || 'processed'}`,
        reason: currentRequest.reason || `Stock ${currentRequest.transactionType || 'transaction'} activity`,
        activityType: currentRequest.activityType || `Stock ${currentRequest.transactionType || 'Transaction'}`,
        completedBy: currentRequest.completedBy || currentRequest.createdBy || "System",
        completedAt: currentRequest.completedAt || currentRequest.createdAt,
        project: currentProject?.projectName || currentRequest.projectName || "Unknown Project",
        rackNumber: currentRequest.rackNumber || "Not specified",
        invoiceNumber: currentRequest.invoiceNumber || "Not specified",
      };
    }

    if (requestType === "order_request") {
      return {
        sku: currentProduct?.productId || "Unknown SKU",
        name: currentProduct?.productName || currentRequest.productName || "Unknown Product",
        currentStock: `${currentRequest.quantity || 0} units requested`,
        reason: currentRequest.reason || `Order request for ${currentRequest.quantity || 0} units`,
        orderType: currentRequest.type === 'in' ? 'Stock IN Order' : 'Stock OUT Order',
        project: currentProject?.projectName || currentRequest.projectName || "Unknown Project",
        invoiceNumber: currentRequest.invoiceNumber || "Not specified",
        supplierName: currentRequest.supplierName || "Not specified",
        dateRequested: currentRequest.date || currentRequest.createdAt,
        status: currentRequest.status || "pending",
        createdBy: currentRequest.createdBy || "System",
      };
    }

    if (requestType === "order_completion") {
      return {
        sku: currentProduct?.productId || "Unknown SKU",
        name: currentProduct?.productName || currentRequest.productName || "Unknown Product",
        currentStock: `${currentRequest.quantity || 0} units completed`,
        reason: currentRequest.reason || `Order completed: ${currentRequest.quantity || 0} units`,
        orderType: currentRequest.type === 'in' ? 'Stock IN Order' : 'Stock OUT Order',
        project: currentProject?.projectName || currentRequest.projectName || "Unknown Project",
        invoiceNumber: currentRequest.invoiceNumber || "Not specified",
        supplierName: currentRequest.supplierName || "Not specified",
        completedAt: currentRequest.completedAt || currentRequest.createdAt,
        completedBy: currentRequest.completedBy  ||currentRequest.createdBy|| "System",
        status: "completed",
      };
    }

    return {
      sku: currentProduct.productId || "Unknown SKU",
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
    const formatDate = (dateValue) => {
      try {
        const date = new Date(dateValue);
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }) + " at " + date.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      } catch (error) {
        return "Unknown Date";
      }
    };

    const getBestUsername = (request, userTypes = ['completedBy', 'requestedBy', 'approvedBy', 'createdBy']) => {
      if (!request) {
        return session?.user?.name || session?.user?.email || "System";
      }

      for (const userType of userTypes) {
        const nameField = `${userType}Name`;
        const idField = userType;
        if (request[nameField]) {
          return request[nameField];
        }
        if (request[idField] && userLookup[request[idField]]) {
          return userLookup[request[idField]];
        }
        if (userType === 'completedBy' && session?.user &&
          (request[idField] === session.user.id ||
            request[idField] === session.user.email ||
            !request[idField])) {
          return session.user.name || session.user.email;
        }
        if (request.userName) {
          return request.userName;
        }
        if (request.userEmail) {
          return request.userEmail;
        }
        if (typeof request[idField] === 'string' && request[idField].includes('@')) {
          return request[idField];
        }
        if (request[idField]) {
          const formattedId = formatUserId(request[idField]);
          return formattedId;
        }
      }
      if (session?.user && (session.user.name || session.user.email)) {
        return session.user.name || session.user.email;
      }
      return "System User";
    };

    if (currentRequest.status === "completed" && showTrigger === false) {
      const formattedDate = formatDate(
        currentRequest.completedAt ||
        currentRequest.timestamp ||
        currentRequest.createdAt
      );

      const actorName = getBestUsername(currentRequest, ['completedBy', 'requestedBy', 'approvedBy']);

      const activityType =
        currentRequest.metadata?.activityType ||
        currentRequest.type ||
        "activity";

      return [
        {
          status: "Activity Completed",
          dueDate: formattedDate,
          icon: User,
          iconColor: "#008919",
        },
        {
          status: `${actorName} performed ${activityType}`,
          dueDate:
            currentRequest.reason ||
            currentRequest.remark ||
            "System generated activity",
          icon: User,
          iconColor: "#4283DE",
        },
      ];
    }

    if (requestType === "product_update") {
      const formattedDate = formatDate(currentRequest.timestamp || Date.now());
      const actorName = getBestUsername(currentRequest, ['completedBy', 'requestedBy', 'approvedBy']);

      return [
        {
          status: "Product Update Completed",
          dueDate: formattedDate,
          icon: User,
          iconColor: "#8B5CF6",
        },
        {
          status: `${actorName} updated product details`,
          dueDate: currentRequest.reason || currentRequest.message || "Product information updated",
          icon: User,
          iconColor: "#4283DE",
        },
      ];
    }

    if (currentRequest.status === "approved") {
      const requestDate = new Date(
        currentRequest.createdAt || currentRequest.requestedAt
      );
      const formattedRequestDate = formatDate(requestDate);

      const approvalDate = formatDate(
        currentRequest.approvedAt ||
        currentRequest.updatedAt ||
        (currentRequest.timestamps?.approved ? new Date(currentRequest.timestamps.approved) : Date.now())
      );

      const approverName = getBestUsername(currentRequest, ['approvedBy']);

      const requestTypeText =
        requestType === "transfer"
          ? "transfer request"
          : "stock adjustment request";
      const requestorName = getBestUsername(currentRequest, ['requestedBy']);

      return [
        {
          status: "Approved",
          dueDate: "Ready for Completion",
          icon: User,
          iconColor: "#28a745",
        },
        {
          status: `${approverName} approved ${requestTypeText}`,
          dueDate: approvalDate,
          icon: User,
          iconColor: "#4283DE",
        },
        {
          status: `${requestorName} created ${requestTypeText}`,
          dueDate: formattedRequestDate,
          icon: User,
          iconColor: "#895BBA",
        },
      ];
    }

    if (currentRequest.status === "rejected") {
      const requestDate = new Date(
        currentRequest.createdAt || currentRequest.requestedAt
      );
      const formattedRequestDate = formatDate(requestDate);

      const rejectionDate = formatDate(
        currentRequest.rejectedAt ||
        currentRequest.updatedAt ||
        (currentRequest.timestamps?.rejected ? new Date(currentRequest.timestamps.rejected) : Date.now())
      );

      const rejectorName = getBestUsername(currentRequest, ['rejectedBy', 'approvedBy']);

      const requestTypeText =
        requestType === "transfer"
          ? "transfer request"
          : "stock adjustment request";
      const requestorName = getBestUsername(currentRequest, ['requestedBy']);

      return [
        {
          status: "Rejected",
          dueDate: "No Further Action Required",
          icon: User,
          iconColor: "#dc3545",
        },
        {
          status: `${rejectorName} rejected ${requestTypeText}`,
          dueDate: rejectionDate,
          icon: User,
          iconColor: "#4283DE",
        },
        {
          status: `${requestorName} created ${requestTypeText}`,
          dueDate: formattedRequestDate,
          icon: User,
          iconColor: "#895BBA",
        },
      ];
    }

    if (requestType === "order_request") {
      const requestDate = new Date(
        currentRequest.createdAt || currentRequest.date || Date.now()
      );
      const formattedDate = formatDate(requestDate);

      const requestorName = getBestUsername(currentRequest, ['createdBy', 'requestedBy']);
      const orderType = currentRequest.type === 'in' ? 'Stock IN' : 'Stock OUT';
      const status = currentRequest.status || 'pending';

      return [
        {
          status: status === 'pending' ? 'Order Pending' : 'Order Completed',
          dueDate: status === 'pending' ? 'Awaiting Completion' : 'Completed',
          icon: User,
          iconColor: status === 'pending' ? '#E27100' : '#28a745',
        },
        {
          status: `${requestorName} created ${orderType} order`,
          dueDate: formattedDate,
          icon: User,
          iconColor: "#895BBA",
        },
      ];
    }

    if (requestType === "order_completion") {
      const completedDate = new Date(
        currentRequest.completedAt || currentRequest.createdAt || Date.now()
      );
      const formattedCompletedDate = formatDate(completedDate);

      const completedByName = getBestUsername(currentRequest, ['completedBy']);
      const orderType = currentRequest.type === 'in' ? 'Stock IN' : 'Stock OUT';

      return [
        {
          status: 'Order Completed',
          dueDate: 'Successfully Completed',
          icon: User,
          iconColor: '#28a745',
        },
        {
          status: `${completedByName} completed ${orderType} order`,
          dueDate: formattedCompletedDate,
          icon: User,
          iconColor: "#4283DE",
        },
      ];
    }
    const requestDate = new Date(
      currentRequest.createdAt || currentRequest.requestedAt
    );
    const formattedDate = formatDate(requestDate);

    const requestTypeText =
      requestType === "transfer"
        ? "transfer request"
        : "stock adjustment request";
    const requestorName = getBestUsername(currentRequest, ['requestedBy']);

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
  const userRole = session?.user?.role;
  const isAdmin = userRole === "admin";
  // Only admins can approve any request type; managers/keepers can only complete approved transfers where allowed elsewhere.
  const canApprove = isAdmin;
  const [isApproving, setIsApproving] = useState(false);
  const handleApproveRequest = async () => {
    if (!canApprove || !currentRequest) return;

    try {
      setIsApproving(true);
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

        }
      }

      let response;

      if (requestType === "transfer") {
        // Validate approved quantity (optional input). If empty/invalid, default to full requested
        let approvedQty = Number(approvedQtyInput);
        if (!Number.isFinite(approvedQty) || approvedQty <= 0) {
          approvedQty = Number(currentRequest.quantity) || 0;
        }
        if (approvedQty > Number(currentRequest.quantity)) {
          toast.error("Approved quantity cannot exceed requested quantity");
          return;
        }
        response = await fetch("/api/transfers", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transferId: currentRequest._id,
            status: "approved",
            approvedBy: session?.user?.id,
            approvedByName: session?.user?.name || session?.user?.email || "Unknown User",
            approvedQuantity: approvedQty,
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

          await new Promise((resolve) => setTimeout(resolve, 500));

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
            console.warn(
              "Could not fetch post-approval stock values:",
              stockCheckError
            );
          }
        }

        toast.success(`${requestTypeText} request approved successfully!`);
        setTimeout(() => {
          window.location.reload();
        }, 600);
      } else {
        const data = await response.json();
        console.error("APPROVAL FAILED:", data);
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request. Please try again.");
    } finally {
      setIsApproving(false);
    }
  };

  const extractProductUpdateChanges = (activity) => {
    let changesData = null;

    if (activity.changes) {
      changesData = activity.changes;

      if (changesData.excludedProjects) {
        return [{
          field: "Excluded Projects",
          oldValue: changesData.excludedProjects.from || "None",
          newValue: changesData.excludedProjects.to || "None"
        }];
      }
    }
    else if (activity.data && typeof activity.data === 'string') {
      try {
        const parsedData = JSON.parse(activity.data);
        if (parsedData.changes) {
          changesData = parsedData.changes;
        }
      } catch (e) {
      }
    }
    else if (typeof activity === 'object' && !Array.isArray(activity)) {
      const potentialChangeFields = Object.entries(activity).filter(([key, value]) =>
        typeof value === 'object' && value !== null && !Array.isArray(value) &&
        (value.from !== undefined || value.to !== undefined ||
          value.old !== undefined || value.new !== undefined)
      );

      if (potentialChangeFields.length > 0) {
        changesData = Object.fromEntries(potentialChangeFields);
      }
    }
    else if (activity.metadata && activity.metadata.changedFields) {
      const changedFields = activity.metadata.changedFields;

      changesData = {};
      changedFields.forEach(field => {
        changesData[field] = {
          from: "Previous Value",
          to: "Updated Value"
        };
      });
    }
    else if (activity.type === 'product_update' || activity.action === 'updated product') {
      return [{
        field: "Product Details",
        oldValue: "Previous Configuration",
        newValue: "Updated Configuration"
      }];
    }

    if (!changesData) {
      return [];
    }

    try {
      const changes = typeof changesData === 'string'
        ? JSON.parse(changesData)
        : changesData;


      if (changes && typeof changes === 'object') {
        if (Array.isArray(changes)) {
          return changes.map(change => {
            return {
              field: change.field || change.name || "Unknown Field",
              oldValue: change.oldValue || change.old || change.from || "N/A",
              newValue: change.newValue || change.new || change.to || "N/A"
            };
          });
        }

        return Object.entries(changes).map(([field, value]) => {
          let formattedField = field
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase());
          if (field === 'productName') formattedField = 'Product Name';
          if (field === 'productCode' || field === 'code') formattedField = 'Product Code';
          if (field === 'productPrice' || field === 'price') formattedField = 'Price';
          if (field === 'serialNo') formattedField = 'Serial Number';
          let oldValue, newValue;

          if (value && typeof value === 'object' && (value.from !== undefined || value.to !== undefined)) {
            oldValue = value.from !== undefined ? value.from : 'N/A';
            newValue = value.to !== undefined ? value.to : 'N/A';
          }
          else if (value && typeof value === 'object' && (value.old !== undefined || value.new !== undefined)) {
            oldValue = value.old !== undefined ? value.old : (value.oldValue !== undefined ? value.oldValue : 'N/A');
            newValue = value.new !== undefined ? value.new : (value.newValue !== undefined ? value.newValue : 'N/A');
          } else {
            oldValue = 'Previous Value';
            newValue = value;
          }

          if (oldValue === null || oldValue === undefined) oldValue = 'Not Set';
          if (newValue === null || newValue === undefined) newValue = 'Not Set';

          if (oldValue === '') oldValue = '(Empty)';
          if (newValue === '') newValue = '(Empty)';

          if (typeof oldValue !== 'string' && typeof oldValue !== 'number') {
            oldValue = JSON.stringify(oldValue);
          }
          if (typeof newValue !== 'string' && typeof newValue !== 'number') {
            newValue = JSON.stringify(newValue);
          }

          if (typeof oldValue === 'string' && oldValue.length > 50) {
            oldValue = oldValue.substring(0, 47) + '...';
          }
          if (typeof newValue === 'string' && newValue.length > 50) {
            newValue = newValue.substring(0, 47) + '...';
          }

          if (field.toLowerCase().includes('price')) {
            oldValue = typeof oldValue === 'number' ? `$${oldValue.toFixed(2)}` : oldValue;
            newValue = typeof newValue === 'number' ? `$${newValue.toFixed(2)}` : newValue;
          }

          return {
            field: formattedField,
            oldValue: oldValue,
            newValue: newValue
          };
        });
      }

      return [];
    } catch (error) {
      console.error("Error parsing product update changes:", error);
      return [{
        field: "Product Information",
        oldValue: "Previous Value",
        newValue: "Updated"
      }];
    }
  };



  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        {showTrigger && (
          <SheetTrigger
            className={`font-normal cursor-pointer !text-[15px] w-fit py-0.5 px-2 rounded-md ${requestType === "transfer"
              ? "text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
              : "text-lemonChrome bg-lemonChrome/20"
              }`}
          >
            {pendingCount} {triggerText}
          </SheetTrigger>
        )}
        <SheetContent className="gap-0 bg-white border-none ">
          {totalRequests > 0 ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  <div className="flex flex-row items-center gap-2 pb-4 mt-5 border-b border-black/10">
                    <div className="flex flex-col items-center justify-center !w-10 h-10 aspect-square rounded-full bg-[#4283DE]/10">
                      <FolderDotIcon className="w-5 h-5 stroke-[#4283DE]" />
                    </div>
                    <div className="flex flex-row">
                      <p className="font-normal">
                        {requestType === "product_update" ? (
                          <>
                            <p>{currentRequest?.userName || "User"}</p> updated product details for
                            <span className="!text-base font-medium ml-1">
                              {currentProduct?.productName || currentRequest?.productName || currentRequest?.entityName || productName}
                            </span>
                          </>
                        ) : (
                          <>
                            {requestType === "order_request" ? (
                              <>
                                Order request for
                                <span className="!text-base font-medium ml-1">
                                  {currentProduct?.productName || productName}
                                </span>
                              </>
                            ) : requestType === "order_completion" ? (
                              <>
                                Order completed for
                                <span className="!text-base font-medium ml-1">
                                  {currentProduct?.productName || productName}
                                </span>
                              </>
                            ) : (
                              <>
                                {currentRequest?.projectName ||
                                  currentProject?.projectName ||
                                  projectName} created {requestType === "transfer" ? "transfer" : "stock"} request for
                                <span className="!text-base font-medium ml-1">
                                  {currentProduct?.productName || productName}
                                </span>
                              </>
                            )}
                          </>
                        )}
                        <span
                          className="!text-xs font-medium rounded-sm uppercase px-2 py-1 ml-2"
                          style={{
                            backgroundColor: `${statusColor}10`,
                            color: statusColor,
                          }}
                        >
                          {requestType === "product_update" ? "Completed" : currentRequest?.status || status}
                        </span>
                      </p>
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 overflow-y-auto">
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
                  {requestType === "product_update" ? (
                    <>
                      <ApprovalSheetLable
                        label="Activity Type:"
                        value={getDynamicProductDetails().activityType || "Product Update"}
                        icon={ArchiveRestore}
                        iconColor="#8B5CF6"
                      />
                      <ApprovalSheetLable
                        label="Updated By:"
                        value={getDynamicProductDetails().updatedBy}
                        icon={User}
                        iconColor="#9333EA"
                      />
                      <ApprovalSheetLable
                        label="Updated At:"
                        value={getDynamicProductDetails().timestamp}
                        icon={MailOpen}
                        iconColor="#007D51"
                      />
                    </>
                  ) : currentRequest?.status === "completed" &&
                    showTrigger === false ? (
                    <>
                      <ApprovalSheetLable
                        label="Activity Type:"
                        value={getDynamicProductDetails().activityType}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                      <ApprovalSheetLable
                        label="Impact:"
                        value={getDynamicProductDetails().currentStock}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                      <ApprovalSheetLable
                        label="Completed By:"
                        value={getDynamicProductDetails().completedBy}
                        icon={User}
                        iconColor="#9333EA"
                      />
                      <ApprovalSheetLable
                        label="Completed At:"
                        value={
                          getDynamicProductDetails().completedAt
                            ? new Date(
                              getDynamicProductDetails().completedAt
                            ).toLocaleString()
                            : "Unknown"
                        }
                        icon={MailOpen}
                        iconColor="#007D51"
                      />
                    </>
                  ) : requestType === "transfer" ? (
                    <>
                      <ApprovalSheetLable
                        label="Transfer Type:"
                        value={getDynamicProductDetails().transferType}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                      <ApprovalSheetLable
                        label={
                          requestType === "transfer"
                            ? "Quantity:"
                            : "Current Stock:"
                        }
                        value={getDynamicProductDetails().currentStock}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                      {currentRequest?.approvedQuantity && (
                        <ApprovalSheetLable
                          label="Approved Quantity:"
                          value={`${currentRequest.approvedQuantity}`}
                          icon={ArchiveRestore}
                          iconColor="#28a745"
                        />
                      )}
                      {isAdmin && currentRequest?.status === "pending" && requestType === "transfer" && (
                        <div className="mt-2">
                          <label className="block px-1 mb-1 text-sm font-medium text-gray-700 text-start w-fit">
                            Approve Quantity (optional)
                          </label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={1}
                              max={maxRequestQty || undefined}
                              placeholder={`Default ${currentRequest.quantity}`}
                              value={approvedQtyInput}
                              onChange={(e) => setApprovedQtyInput(e.target.value)}
                            />
                            <span className="text-xs text-gray-500">Requested: {currentRequest.quantity}</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : requestType === "activity" ? (
                    <>
                      <ApprovalSheetLable
                        label="Activity Type:"
                        value={getDynamicProductDetails().activityType}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                      <ApprovalSheetLable
                        label="Quantity:"
                        value={getDynamicProductDetails().currentStock}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                      <ApprovalSheetLable
                        label="Rack:"
                        value={getDynamicProductDetails().rackNumber}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                      <ApprovalSheetLable
                        label="Invoice:"
                        value={getDynamicProductDetails().invoiceNumber}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                      <ApprovalSheetLable
                        label="Completed By:"
                        value={getDynamicProductDetails().completedBy}
                        icon={User}
                        iconColor="#9333EA"
                      />
                      <ApprovalSheetLable
                        label="Completed At:"
                        value={
                          getDynamicProductDetails().completedAt
                            ? new Date(
                              getDynamicProductDetails().completedAt
                            ).toLocaleString()
                            : "Unknown"
                        }
                        icon={MailOpen}
                        iconColor="#007D51"
                      />
                    </>
                  ) : requestType === "order_request" ? (
                    <>
                      <ApprovalSheetLable
                        label="Order Type:"
                        value={getDynamicProductDetails().orderType}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                      <ApprovalSheetLable
                        label="Quantity:"
                        value={getDynamicProductDetails().currentStock}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                      <ApprovalSheetLable
                        label="Invoice Number:"
                        value={getDynamicProductDetails().invoiceNumber}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                      <ApprovalSheetLable
                        label="Supplier:"
                        value={getDynamicProductDetails().supplierName}
                        icon={User}
                        iconColor="#9333EA"
                      />
                      <ApprovalSheetLable
                        label="Date Requested:"
                        value={
                          getDynamicProductDetails().dateRequested
                            ? new Date(
                              getDynamicProductDetails().dateRequested
                            ).toLocaleString()
                            : "Unknown"
                        }
                        icon={MailOpen}
                        iconColor="#007D51"
                      />
                      <ApprovalSheetLable
                        label="Status:"
                        value={getDynamicProductDetails().status}
                        icon={ArchiveRestore}
                        iconColor="#F59E0B"
                      />
                    </>
                  ) : requestType === "order_completion" ? (
                    <>
                      <ApprovalSheetLable
                        label="Order Type:"
                        value={getDynamicProductDetails().orderType}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                      <ApprovalSheetLable
                        label="Quantity:"
                        value={getDynamicProductDetails().currentStock}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                      <ApprovalSheetLable
                        label="Invoice Number:"
                        value={getDynamicProductDetails().invoiceNumber}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                      <ApprovalSheetLable
                        label="Supplier:"
                        value={getDynamicProductDetails().supplierName}
                        icon={User}
                        iconColor="#9333EA"
                      />
                      <ApprovalSheetLable
                        label="Completed By:"
                        value={getDynamicProductDetails().completedBy}
                        icon={User}
                        iconColor="#9333EA"
                      />
                      <ApprovalSheetLable
                        label="Completed At:"
                        value={
                          getDynamicProductDetails().completedAt
                            ? new Date(
                              getDynamicProductDetails().completedAt
                            ).toLocaleString()
                            : "Unknown"
                        }
                        icon={MailOpen}
                        iconColor="#007D51"
                      />
                    </>
                  ) : (
                    <>
                      <ApprovalSheetLable
                        label="Rack:"
                        value={getDynamicProductDetails().rack}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                      <ApprovalSheetLable
                        label="Current Stock:"
                        value={getDynamicProductDetails().currentStock}
                        icon={ArchiveRestore}
                        iconColor="#4283DE"
                      />
                    </>
                  )}
                  {requestType !== "product_update" && requestType !== "activity" && requestType !== "order_request" && requestType !== "order_completion" && (
                    <ApprovalSheetLable
                      label={
                        currentRequest?.status === "completed" &&
                          showTrigger === false
                          ? "Description:"
                          : "Reason:"
                      }
                      value={getDynamicProductDetails().reason}
                      icon={MailOpen}
                      iconColor="#007D51"
                    />
                  )}
                  {requestType === "product_update" && (
                    <div className="mt-2">
                      <h3 className="mb-2 text-sm font-medium text-gray-700">Product Changes:</h3>
                      <div className="overflow-hidden border border-gray-200 rounded-md bg-gray-50">
                        <table className="min-w-full divide-y divide-gray-200 table-fixed">
                          <thead className="bg-gray-100">
                            <tr>
                              <th scope="col" className="w-1/4 px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">Field</th>
                              <th scope="col" className="w-2/5 px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">Previous Value</th>
                              <th scope="col" className="w-2/5 px-4 py-2 text-xs font-medium text-left text-gray-500 uppercase">New Value</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {(() => {
                              const changes = getDynamicProductDetails().changes;

                              if (changes && Array.isArray(changes) && changes.length > 0) {
                                return changes.map((change, index) => (
                                  <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                    <td className="px-4 py-2 text-sm text-gray-900 break-words">{change.field}</td>
                                    <td className="px-4 py-2 text-sm text-red-600 break-words">{change.oldValue}</td>
                                    <td className="px-4 py-2 text-sm text-green-600 break-words">{change.newValue}</td>
                                  </tr>
                                ));
                              } else {
                                const forcedChanges = extractProductUpdateChanges(currentRequest);

                                if (Array.isArray(forcedChanges) && forcedChanges.length > 0) {
                                  return forcedChanges.map((change, index) => (
                                    <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                      <td className="px-4 py-2 text-sm text-gray-900 break-words">{change.field}</td>
                                      <td className="px-4 py-2 text-sm text-red-600 break-words">{change.oldValue}</td>
                                      <td className="px-4 py-2 text-sm text-green-600 break-words">{change.newValue}</td>
                                    </tr>
                                  ));
                                } else {
                                  return (
                                    <tr>
                                      <td colSpan="3" className="px-4 py-3 text-sm text-center text-gray-500">
                                        No specific change details available for this update
                                      </td>
                                    </tr>
                                  );
                                }
                              }
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 py-4 mx-4">
                  <ApproveTracker trackingItems={getDynamicTrackingItems()} />
                </div>
                {requestType === "transfer" &&
                  currentRequest?.status === "approved" && (
                    (() => {
                      const destinationProjectId = currentRequest.toProjectId?.toString?.() || currentRequest.toProjectId;
                      const sourceProjectId = currentRequest.fromProjectId?.toString?.() || currentRequest.fromProjectId;
                      const isTransferIn = currentRequest.transferType === "IN";

                      const userHasAccessToDestination = hasAccessToProject(destinationProjectId);
                      const userHasAccessToSource = sourceProjectId !== "EXTERNAL" ? hasAccessToProject(sourceProjectId) : false;
                      const isLikelyTransferIn = userHasAccessToDestination && !userHasAccessToSource;

                      // Only source managers should complete transfers
                      const isApprovedTransferAwaitingCompletion =
                        currentRequest.status === "approved" &&
                        currentRequest.transferType === "OUT" &&
                        userHasAccessToSource && session?.user?.role === "manager";
                      const isTransferInRackSelection = isTransferIn;
                      const rackSelectionLabel = isTransferInRackSelection ? "Select Source Rack" : "Select Destination Rack";
                      const rackSelectionPlaceholder = isTransferInRackSelection ? "Select source rack" : "Select destination rack";
                      const noRacksMessage = isTransferInRackSelection ? "No racks found in source project" : "No racks found in destination project";
                      const loadingMessage = isTransferInRackSelection ? "Loading source racks..." : "Loading destination racks...";

                      return (
                        <div className="flex flex-col gap-2 pb-4 mx-4 border-b border-black/10">
                          <div className="space-y-2">
                            <div className="relative z-20 w-full">
                              <label
                                htmlFor="destination-rack-select"
                                className="block px-1 mb-1 text-sm font-medium text-gray-700 text-start w-fit"
                              >
                                {rackSelectionLabel} <span className="text-red-500">*</span>
                              </label>
                              {loadingDestinationRacks ? (
                                <div className="w-full px-3 py-2 text-gray-500 border border-gray-300 rounded-md bg-gray-50">
                                  {loadingMessage}
                                </div>
                              ) : destinationRacks.length > 0 ? (
                                <Select
                                  value={selectedDestinationRack}
                                  onValueChange={setSelectedDestinationRack}
                                  disabled={loadingDestinationRacks || destinationRacks.length === 0}
                                >
                                  <SelectTrigger
                                    className="!h-12 w-full [&_span]:!text-sm rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                    id="destination-rack-select"
                                  >
                                    <SelectValue placeholder={rackSelectionPlaceholder} />
                                  </SelectTrigger>
                                  <SelectContent position="popper" className="bg-white z-[100] [&_span]:!text-sm">
                                    {destinationRacks.map((rack) => (
                                      <SelectItem key={rack.value} value={rack.value}>
                                        {rack.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="w-full px-3 py-2 text-red-600 border border-red-300 rounded-md bg-red-50">
                                  {noRacksMessage}
                                </div>
                              )}
                              {currentRequest?.approvedQuantity ? (
                                <div className="mt-1 text-xs text-gray-500">
                                  Approved quantity: {currentRequest.approvedQuantity}
                                </div>
                              ) : null}
                            </div>

                             {selectedDestinationRack && (
                              <Button
                                className="!w-full"
                                variant="default"
                                onClick={handleCompleteTransfer}
                                disabled={isCompletingTransfer}
                              >
                                {isCompletingTransfer
                                  ? "Completing Transfer..."
                                  : "Complete Transfer"}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="flex flex-col items-center justify-center w-20 h-20 mb-4 rounded-full bg-blue-50">
                <FolderDotIcon className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                {requestType === "transfer"
                  ? session?.user?.role === "admin"
                    ? "No Pending Transfer Approvals"
                    : "No Transfer Requests to Complete"
                  : "No Pending Approvals"
                }
              </h3>
              <p className="text-sm text-gray-500">
                {requestType === "transfer"
                  ? session?.user?.role === "admin"
                    ? "All transfer requests have been processed."
                    : "No approved transfers are ready for completion."
                  : "All requests have been processed."
                }
              </p>
            </div>
          )}
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
                {currentRequest?.status === "completed" && showTrigger === false || requestType === "product_update" ? (
                  <div
                    className={
                      totalRequests > 1
                        ? "w-[calc(95%-120px)]"
                        : "w-full"
                    }
                    style={{ borderRadius: 0 }}
                  >
                    <div className="w-full p-4 text-center text-gray-600 bg-blue-50">
                      {requestType === "product_update"
                        ? "Product Update Details"
                        : `Activity Report #${currentRequestIndex + 1} of ${totalRequests}`}
                      <div className="mt-1 text-xs text-gray-500">
                        {requestType === "product_update"
                          ? "Product Information Change Record"
                          : "Completed Activity - View Only"}
                      </div>
                    </div>
                  </div>
                ) : canApprove && currentRequest?.status === "pending" ? (
                  <Button
                    className={
                      totalRequests > 1
                        ? "w-[calc(95%-120px)]"
                        : "w-full"
                    }
                    style={{ borderRadius: 0 }}
                    type="submit"
                    onClick={handleApproveRequest}
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <span className="flex items-center justify-center w-full">
                        <svg className="mr-3 -ml-1 size-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span className="sr-only">Processing...</span>
                      </span>
                    ) : (
                      "Approve Request"
                    )}
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
                      {currentRequest?.status === "pending"
                        ? " - Pending Approval"
                        : currentRequest?.status === "approved"
                          ? " - Approved"
                          : currentRequest?.status === "rejected"
                            ? " - Rejected"
                            : ""}
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
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ApprovalSheet;
