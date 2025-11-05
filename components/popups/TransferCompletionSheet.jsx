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
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const TransferCompletionSheet = ({
  triggerText = "COMPLETE TRANSFERS",
  pendingCount = 0,
  session = null,
  productId = null,
  isOpen,
  onOpenChange,
  showTrigger = true,
}) => {
  const [currentTransferIndex, setCurrentTransferIndex] = useState(0);
  const [internalSheetOpen, setInternalSheetOpen] = useState(false);
  const [approvedTransfers, setApprovedTransfers] = useState([]);
  const [destinationRacks, setDestinationRacks] = useState([]);
  const [selectedDestinationRack, setSelectedDestinationRack] = useState("");
  const [loadingRacks, setLoadingRacks] = useState(false);
  const [isCompletingTransfer, setIsCompletingTransfer] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [currentProject, setCurrentProject] = useState(null);
  const isSheetOpen = isOpen !== undefined ? isOpen : internalSheetOpen;
  const setIsSheetOpen = onOpenChange !== undefined ? onOpenChange : setInternalSheetOpen;
  const currentTransfer = approvedTransfers[currentTransferIndex] || null;

  useEffect(() => {
    if (isSheetOpen && session?.user?.id && productId) {
      fetchApprovedTransfers();
    }
  }, [isSheetOpen, session?.user?.id, productId]);

  useEffect(() => {
    if (currentTransfer && currentTransfer.toProjectId) {
      fetchDestinationRacks();
      fetchTransferDetails();
    } else {
      setDestinationRacks([]);
      setSelectedDestinationRack("");
    }
  }, [currentTransfer]);

  const fetchApprovedTransfers = async () => {
    try {
      const projectsResponse = await fetch(`/api/manager/assigned-projects?productId=${productId}`);
      const projectsData = await projectsResponse.json();
      
      if (!projectsData.assignedProjects || projectsData.assignedProjects.length === 0) {
        setApprovedTransfers([]);
        return;
      }

      const assignedProjectIds = projectsData.assignedProjects.map(p => p._id);

      const transfersResponse = await fetch(`/api/transfers?status=approved&productId=${productId}`);
      const transfersData = await transfersResponse.json();

      if (transfersResponse.ok && transfersData.transfers) {
        // Only show for source managers: where user's assigned projects include transfer.fromProjectId
        const relevantTransfers = transfersData.transfers.filter(transfer => {
          const isSourceManager = assignedProjectIds.includes(transfer.fromProjectId.toString());
          return isSourceManager;
        });

        setApprovedTransfers(relevantTransfers);
      } else {
        setApprovedTransfers([]);
        toast.error("Failed to fetch transfers");
      }
    } catch (error) {
      setApprovedTransfers([]);
      toast.error(`Error fetching approved transfers: ${error.message}`);
    }
  };  const fetchDestinationRacks = async () => {
    if (!currentTransfer?.toProjectId) return;

    setLoadingRacks(true);
    try {
      const response = await fetch(`/api/Racks?projectId=${currentTransfer.toProjectId}`);
      const data = await response.json();

      if (response.ok && data.racks) {
        const rackOptions = data.racks.map(rack => ({
          value: rack.rackNumber,
          label: rack.rackNumber,
          id: rack._id
        }));
        
        setDestinationRacks(rackOptions);
      } else {
        toast.error(`Failed to fetch destination racks: ${data.error || "Unknown error"}`);
        setDestinationRacks([]);
      }
    } catch (error) {
      toast.error(`Error fetching destination racks: ${error.message}`);
      setDestinationRacks([]);
    } finally {
      setLoadingRacks(false);
    }
  };

  const fetchTransferDetails = async () => {
    if (!currentTransfer) return;

    try {
      const productResponse = await fetch(`/api/Products/${currentTransfer.productId}`);
      if (productResponse.ok) {
        const productData = await productResponse.json();
        setCurrentProduct(productData);
      }
      const projectResponse = await fetch(`/api/Projects/${currentTransfer.toProjectId}`);
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setCurrentProject(projectData);
      }
    } catch (error) {
      toast.error(`Error fetching transfer details: ${error.message}`);
    }
  };

  const handleCompleteTransfer = async () => {
    if (!currentTransfer || !selectedDestinationRack) {
      toast.error("Please select a destination rack to complete the transfer.");
      return;
    }

    setIsCompletingTransfer(true);

    try {
      const response = await fetch("/api/transfers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transferId: currentTransfer._id,
          action: "complete",
          destinationRack: selectedDestinationRack,
          completedBy: session?.user?.id,
          
        }),
      });

      if (response.ok) {
        toast.success(`Transfer completed successfully! ${currentTransfer.quantity} units moved to rack ${selectedDestinationRack}.`);
        await fetchApprovedTransfers();
        setSelectedDestinationRack("");
        setCurrentTransferIndex(0);
        setTimeout(() => {
          setIsSheetOpen(false);
          window.location.reload();
        }, 1000);
      } else {
        const errorData = await response.json();
        toast.error(`Error: ${errorData.error || "Failed to complete transfer"}`);
      }
    } catch (error) {
      toast.error("Failed to complete transfer. Please try again.");
    } finally {
      setIsCompletingTransfer(false);
    }
  };

  const handleNext = () => {
    if (currentTransferIndex < approvedTransfers.length - 1) {
      setCurrentTransferIndex(currentTransferIndex + 1);
      setSelectedDestinationRack("");
    }
  };

  const handlePrevious = () => {
    if (currentTransferIndex > 0) {
      setCurrentTransferIndex(currentTransferIndex - 1);
      setSelectedDestinationRack("");
    }
  };

  const triggerContent = showTrigger ? (
    <div className="flex items-center gap-2 px-4 py-2 transition-colors border border-blue-200 rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100">
      <CheckCircle className="w-5 h-5 text-blue-600" />
      <span className="text-sm font-medium text-blue-700">{triggerText}</span>
      {pendingCount > 0 && (
        <span className="px-2 py-1 text-xs font-bold text-white bg-blue-600 rounded-full">
          {pendingCount}
        </span>
      )}
    </div>
  ) : null;

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      {triggerContent && (
        <SheetTrigger asChild>
          {triggerContent}
        </SheetTrigger>
      )}
      
      <SheetContent className="w-full max-w-2xl p-0 bg-white">
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <SheetTitle className="flex items-center gap-2 text-xl font-semibold text-gray-800">
            <CheckCircle className="w-6 h-6 text-blue-600" />
            Complete Stock Transfers
          </SheetTitle>
          <SheetDescription className="text-gray-600">
            Select destination racks for approved transfers to your projects
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {approvedTransfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderDotIcon className="w-16 h-16 mb-4 text-gray-300" />
              <h3 className="mb-2 text-lg font-medium text-gray-500">
                No Transfers to Complete
              </h3>
              <p className="max-w-md text-sm text-gray-400">
                There are no approved transfers awaiting completion for your projects.
              </p>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex items-center justify-between p-4 mb-6 rounded-lg bg-gray-50">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={currentTransferIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium text-gray-600">
                    {currentTransferIndex + 1} of {approvedTransfers.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={currentTransferIndex === approvedTransfers.length - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-sm text-gray-500">
                  Transfers awaiting completion
                </div>
              </div>

              {currentTransfer && (
                <div className="space-y-6">
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <h4 className="mb-4 text-lg font-semibold text-gray-800">Transfer Details</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                          Product
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <Barcode className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-800">
                            {currentProduct?.productName || "Loading..."}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                          Quantity
                        </label>
                        <div className="mt-1 text-lg font-bold text-blue-600">
                          {currentTransfer.quantity} units
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                          From Project
                        </label>
                        <div className="mt-1 text-sm text-gray-800">
                          Source Project
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                          To Your Project
                        </label>
                        <div className="mt-1 text-sm font-medium text-gray-800">
                          {currentProject?.name || currentProject?.projectName || "Loading..."}
                        </div>
                      </div>
                    </div>

                    {currentTransfer.reason && (
                      <div className="mt-4">
                        <label className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                          Reason
                        </label>
                        <p className="mt-1 text-sm text-gray-700">
                          {currentTransfer.reason}
                        </p>
                      </div>
                    )}

                    {currentTransfer.fromRack && (
                      <div className="mt-4">
                        <label className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                          Source Rack
                        </label>
                        <div className="mt-1 text-sm font-medium text-gray-800">
                          {currentTransfer.fromRack}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <h4 className="mb-4 text-lg font-semibold text-blue-800">
                      Select Destination Rack
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-blue-700">
                          Choose rack to receive {currentTransfer.quantity} units
                        </label>
                        
                        {loadingRacks ? (
                          <div className="w-full px-3 py-2 text-blue-600 border border-blue-300 rounded-md bg-blue-50">
                            Loading available racks...
                          </div>
                        ) : destinationRacks.length > 0 ? (
                          <Select value={selectedDestinationRack} onValueChange={setSelectedDestinationRack}>
                            <SelectTrigger className="w-full border-blue-300 focus:border-blue-500">
                              <SelectValue placeholder="Select a rack to receive the stock" />
                            </SelectTrigger>
                            <SelectContent>
                              {destinationRacks.map((rack) => (
                                <SelectItem key={rack.value} value={rack.value}>
                                  Rack {rack.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="w-full px-3 py-2 text-red-600 border border-red-300 rounded-md bg-red-50">
                            No racks found for this project
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {currentTransfer && (
          <SheetFooter className="flex gap-3 px-6 py-4 border-t bg-gray-50">
            <SheetClose asChild>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </SheetClose>
            <Button
              onClick={handleCompleteTransfer}
              disabled={!selectedDestinationRack || isCompletingTransfer}
              className="flex-1 text-white bg-blue-600 hover:bg-blue-700"
            >
              {isCompletingTransfer ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                  Completing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Complete Transfer
                </span>
              )}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default TransferCompletionSheet;
