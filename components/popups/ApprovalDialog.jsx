"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownFromLine } from "lucide-react";
import { useState, useEffect } from "react";
import SecondaryInput from "@/components/shared/secondary-input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ApprovalDialog = (props) => {
  const {
    title = "Request Approval for Transfer",
    icon: Icon = ArrowDownFromLine,
    iconClassName = "stroke-amalfitanAzure",
    triggerClassName = "flex flex-row items-center justify-center w-12 h-12 p-3.5 rounded-lg cursor-pointer bg-amalfitanAzure/5 hover:bg-amalfitanAzure/10",
    stockQuantityLabel = "Stock Quantity",
    stockQuantityPlaceholder = "Enter quantity",
    reasonLabel = "Reason",
    reasonPlaceholder = "Enter reason for transfer request",
    submitButtonText = "Request Approval",
    cancelButtonText = "Cancel",
    onSubmit,
    defaultStockQuantity = "0",
    defaultReason = "",
    showStockQuantity = true,
    showReason = true,
    reasonRows = 5,
    disabled = false,
    showRackSelection = false,
    sourceProjectId = null,
    productId = null,
    transferType = null,
    session = null,
    destinationProjectId = null,
    availableProjects = [],
    excludeDestinationFromSource = false,
    ...rest
  } = props;
  const open = props.open;
  const onOpenChange = props.onOpenChange;
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const actualOpen = isControlled ? open : internalOpen;
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen;
  const [stockQuantity, setStockQuantity] = useState(defaultStockQuantity);
  const [reason, setReason] = useState(defaultReason);
  const [selectedRack, setSelectedRack] = useState("");
  const [selectedDestinationRack, setSelectedDestinationRack] = useState("");
  const [selectedDestinationProject, setSelectedDestinationProject] = useState("");
  const [selectedSourceProject, setSelectedSourceProject] = useState("");
  const [availableRacks, setAvailableRacks] = useState([]);
  const [availableDestinationRacks, setAvailableDestinationRacks] = useState([]);
  const [availableSourceProjects, setAvailableSourceProjects] = useState([]);
  const [loadingRacks, setLoadingRacks] = useState(false);
  const [loadingDestinationRacks, setLoadingDestinationRacks] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleStockQuantityChange = (e) => {
    setStockQuantity(e.target.value);
  };

  const handleReasonChange = (e) => {
    setReason(e.target.value);
  };

  useEffect(() => {
    if (actualOpen && showRackSelection) {
      if (transferType === "instant" && sourceProjectId === "CROSS_PROJECT_SELECTION") {
        setupCrossProjectSourceSelection();
        if (destinationProjectId && destinationProjectId !== "SELECTION_REQUIRED") {
          fetchAvailableDestinationRacks();
        }
      } else if (transferType === "out" && productId) {
        if (sourceProjectId || session?.user?.role === 'admin') {
          fetchAvailableRacks();
        }
        
        if (session?.user?.role === 'admin' && destinationProjectId && destinationProjectId !== "SELECTION_REQUIRED") {
          fetchAvailableDestinationRacks();
        }
      } else if (transferType === "in" && productId) {
        fetchDestinationRacksForTransferIn();
      }
    }
  }, [actualOpen, showRackSelection, sourceProjectId, destinationProjectId, productId, transferType, session]);

  useEffect(() => {
    if (transferType === "instant" && selectedSourceProject) {
      fetchAvailableRacksForProject(selectedSourceProject);
    }
  }, [selectedSourceProject, transferType]);

  useEffect(() => {
    if (selectedDestinationProject && destinationProjectId === "SELECTION_REQUIRED") {
      fetchAvailableDestinationRacksForProject(selectedDestinationProject);
    }
  }, [selectedDestinationProject, destinationProjectId]);

  const fetchAvailableRacks = async () => {
    setLoadingRacks(true);
    try {
      let apiUrl;
      
      if (session?.user?.role === 'admin' && !sourceProjectId) {
        apiUrl = `/api/stock-validation?productId=${productId}&getAllProjects=true`;
      } else if ((session?.user?.role === 'manager' || session?.user?.role === 'keeper') && transferType === 'out') {
        apiUrl = `/api/manager/transfer-source-racks?productId=${productId}`;
      } else {
        apiUrl = `/api/stock-validation?productId=${productId}&projectId=${sourceProjectId}`;
      }
      
  const response = await fetch(apiUrl);
  const includedProjectsResponse = await fetch(`/api/keeper/included-projects?productId=${productId}`);
  const includedProjectsJson = await includedProjectsResponse.json();
  const includedProjects = includedProjectsJson.projects || [];
  const userProjectResponse = await fetch(`/api/manager/assigned-projects?productId=${productId}`);
  const userProjectJson = await userProjectResponse.json();
  const userProjects = userProjectJson.assignedProjects || [];
  const data = await response.json();


      
      if (response.ok) {
        let racksWithStock = [];
        const usedManagerEndpoint = (session?.user?.role === 'manager' || session?.user?.role === 'keeper') && transferType === 'out' && !!data.racks;
        if (session?.user?.role === 'admin' && !sourceProjectId && data.allProjectsData) {
          data.allProjectsData.forEach(projectData => {
            if (projectData.rackBreakdown) {
              const projectRacks = projectData.rackBreakdown
                .filter(rack => rack.stock > 0)
                .map(rack => ({
                  value: `${projectData.projectId}-${rack.rackNumber}`,
                  label: `${projectData.projectName} - ${rack.rackNumber} (${rack.stock} units available)`,
                  stock: rack.stock,
                  projectId: projectData.projectId,
                  projectName: projectData.projectName,
                  rackNumber: rack.rackNumber
                }));
              racksWithStock = [...racksWithStock, ...projectRacks];
            }
          });
        } else if (usedManagerEndpoint) {
          racksWithStock = data.racks.map(rack => ({
            value: rack.rackNumber,
            label: `${rack.displayLabel}`,
            stock: rack.stock,
            projectId: rack.projectId,
            projectName: rack.projectName,
            rackNumber: rack.rackNumber
          }));
        } else if (data.rackBreakdown) {
          racksWithStock = data.rackBreakdown
            .filter(rack => rack.stock > 0)
            .map(rack => ({
              value: rack.rackNumber,
              label: `${rack.rackNumber} (${rack.stock} units available)`,
              stock: rack.stock
            }));
        }
        if (usedManagerEndpoint) {
          // Restrict to user's projects but preserve Lobby explicitly
          const normalizeId = (x) => {
            try { return (x?._id || x?.id || x)?.toString?.() || String(x); } catch { return String(x); }
          };
          const sessionUserId = (session?.user?.id || '').toString();
          const userProjectIds = new Set((userProjects || []).map(p => normalizeId(p)));
          const lobbyProjectIds = new Set((userProjects || [])
            .filter(p => p?.isLobby === true && normalizeId(p?.lobbyOwner) === sessionUserId)
            .map(p => normalizeId(p?._id)));
          const allowedIds = new Set([...userProjectIds, ...lobbyProjectIds]);
          const filtered = (racksWithStock || []).filter(r => allowedIds.has(normalizeId(r.projectId)));
          setAvailableRacks(filtered);
        } else {
          // Build allow-lists that always include the user's Lobby project(s)
          const normalizeId = (x) => {
            try { return (x?._id || x?.id || x)?.toString?.() || String(x); } catch { return String(x); }
          };
          const sessionUserId = (session?.user?.id || '').toString();
          const includedIds = new Set((includedProjects || []).map(p => normalizeId(p)));
          const userProjectIds = new Set((userProjects || []).map(p => normalizeId(p)));
          const lobbyProjectIds = new Set((userProjects || [])
            .filter(p => p?.isLobby === true && normalizeId(p?.lobbyOwner) === sessionUserId)
            .map(p => normalizeId(p?._id)));

          // First filter by included projects, but always keep Lobby
          let filteredByInclusion;
          if (includedIds.size > 0) {
            filteredByInclusion = (racksWithStock || []).filter(r => {
              const pid = normalizeId(r.projectId);
              return includedIds.has(pid) || lobbyProjectIds.has(pid);
            });
          } else {
            filteredByInclusion = racksWithStock || [];
          }

          // Then, for non-keepers, restrict to user's projects (Lobby is already part of userProjects)
          const filteredRacksWithUserProjects = (filteredByInclusion || []).filter(r => userProjectIds.has(normalizeId(r.projectId)));

          if (session?.user?.role === 'keeper') {
            setAvailableRacks(filteredByInclusion);
          } else {
            setAvailableRacks(filteredRacksWithUserProjects);
          }
        }
      } else {
        console.error("Error response from racks API:", data);
        setAvailableRacks([]);
      }
    } catch (error) {
      console.error("Error fetching available racks:", error);
      setAvailableRacks([]);
    } finally {
      setLoadingRacks(false);
    }
  };

  const fetchAvailableDestinationRacks = async () => {
    setLoadingDestinationRacks(true);
    try {
      const apiUrl = `/api/stock-validation?productId=${productId}&projectId=${destinationProjectId}&forDestination=true`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      if (response.ok) {
        let racksWithSpace = [];
        
        if (data.rackBreakdown) {
          racksWithSpace = data.rackBreakdown.map(rack => ({
            value: rack.rackNumber,
            label: `${rack.rackNumber} (${rack.stock || 0} units current stock)`,
            stock: rack.stock || 0
          }));
        }
        setAvailableDestinationRacks(racksWithSpace);
      } else {
        console.error("API Error:", data);
        setAvailableDestinationRacks([]);
      }
    } catch (error) {
      console.error("Error fetching available destination racks:", error);
      setAvailableDestinationRacks([]);
    } finally {
      setLoadingDestinationRacks(false);
    }
  };

  const fetchAvailableDestinationRacksForProject = async (projectId) => {
    setLoadingDestinationRacks(true);
    try {
      const apiUrl = `/api/stock-validation?productId=${productId}&projectId=${projectId}&forDestination=true`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (response.ok) {
        let racksWithSpace = [];
        
        if (data.rackBreakdown) {
          racksWithSpace = data.rackBreakdown.map(rack => ({
            value: rack.rackNumber,
            label: `${rack.rackNumber} (${rack.stock || 0} units current stock)`,
            stock: rack.stock || 0
          }));
        }
        setAvailableDestinationRacks(racksWithSpace);
      } else {
        console.error("API Error:", data);
        setAvailableDestinationRacks([]);
      }
    } catch (error) {
      console.error("Error fetching available destination racks for project:", error);
      setAvailableDestinationRacks([]);
    } finally {
      setLoadingDestinationRacks(false);
    }
  };

  const fetchDestinationRacksForTransferIn = async () => {
    setLoadingDestinationRacks(true);
    try {
      const userProjectResponse = await fetch(`/api/manager/assigned-projects?productId=${productId}`);
      const includedProjectsForKeepers=await fetch(`/api/keeper/included-projects?productId=${productId}`);
      

      
      const userProjectData = await userProjectResponse.json();
      const includedProjects = await includedProjectsForKeepers.json();
      const assignedProjects = userProjectData.assignedProjects || [];
      
      if (session?.user?.role==='manager' && assignedProjects.length === 0) {
        setAvailableDestinationRacks([]);
        return;
      }

      const destinationProject =session?.user?.role==='manager'? assignedProjects[0]: includedProjects?.projects?.[0];
      const apiUrl = `/api/stock-validation?productId=${productId}&projectId=${destinationProject._id}&forDestination=true`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      

      if (response.ok) {
        let racksWithSpace = [];
        
        if (data.rackBreakdown) {
          racksWithSpace = data.rackBreakdown.map(rack => ({
            value: rack.rackNumber,
            label: `${rack.rackNumber} (${rack.stock || 0} units current stock)`,
            stock: rack.stock || 0
          }));
        }

        setAvailableDestinationRacks(racksWithSpace);
      } else {
        console.error("API Error for Transfer IN destination racks:", data);
        setAvailableDestinationRacks([]);
      }
    } catch (error) {
      console.error("Error fetching Transfer IN destination racks:", error);
      setAvailableDestinationRacks([]);
    } finally {
      setLoadingDestinationRacks(false);
    }
  };

  const setupCrossProjectSourceSelection = () => {

    let sourceProjects = [...availableProjects];
    
    if (excludeDestinationFromSource && destinationProjectId) {
      sourceProjects = sourceProjects.filter(project => 
        project._id !== destinationProjectId
      );
    }

    const formattedProjects = sourceProjects.map(project => ({
      value: project._id,
      label: project.projectName || "Unknown Project",
      stockOnHand: project.stockOnHand || 0
    }));

    setAvailableSourceProjects(formattedProjects);
  };

  const fetchAvailableRacksForProject = async (projectId) => {
    setLoadingRacks(true);
    try {
      const apiUrl = `/api/stock-validation?productId=${productId}&projectId=${projectId}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      

      if (response.ok) {
        let racksWithStock = [];
        
        if (data.rackBreakdown) {
          racksWithStock = data.rackBreakdown
            .filter(rack => rack.stock > 0)
            .map(rack => ({
              value: rack.rackNumber,
              label: `${rack.rackNumber} (${rack.stock} units available)`,
              stock: rack.stock
            }));
        }

        setAvailableRacks(racksWithStock);
      } else {
        console.error("API Error:", data);
        setAvailableRacks([]);
      }
    } catch (error) {
      console.error("Error fetching available racks for project:", error);
      setAvailableRacks([]);
    } finally {
      setLoadingRacks(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (transferType === "instant") {
      if (!selectedSourceProject) {
        toast.error("Please select a source project for the transfer.");
        return;
      }
      if (!selectedRack) {
        toast.error("Please select a source rack for the transfer.");
        return;
      }
      if (!selectedDestinationRack) {
        toast.error("Please select a destination rack for the transfer.");
        return;
      }
      
      const selectedRackData = availableRacks.find(rack => rack.value === selectedRack);
      if (selectedRackData && parseInt(stockQuantity) > selectedRackData.stock) {
        toast.error(`Insufficient stock in selected rack. Available: ${selectedRackData.stock}, Requested: ${stockQuantity}`);
        return;
      }
    }

    if (showRackSelection && transferType === "out" && !selectedRack) {
      toast.error("Please select a source rack for the transfer.");
      return;
    }

    if (showRackSelection && transferType === "in" && !selectedDestinationRack) {
      toast.error("Please select a destination rack for the transfer.");
      return;
    }

    if (session?.user?.role === 'admin' && destinationProjectId === "SELECTION_REQUIRED" && !selectedDestinationProject) {
      toast.error("Please select a destination project for the transfer.");
      return;
    }

    if (session?.user?.role === 'admin' && (destinationProjectId && destinationProjectId !== "SELECTION_REQUIRED") && !selectedDestinationRack) {
      toast.error("Please select a destination rack for the transfer.");
      return;
    }

    if (session?.user?.role === 'admin' && destinationProjectId === "SELECTION_REQUIRED" && selectedDestinationProject && !selectedDestinationRack) {
      toast.error("Please select a destination rack for the transfer.");
      return;
    }

    if (showRackSelection && transferType === "out" && selectedRack) {
      const selectedRackData = availableRacks.find(rack => rack.value === selectedRack);
      if (selectedRackData && parseInt(stockQuantity) > selectedRackData.stock) {
        toast.error(`Insufficient stock in selected rack. Available: ${selectedRackData.stock}, Requested: ${stockQuantity}`);
        return;
      }
    }

    if (onSubmit) {
      try {
        setSubmitting(true);
        const result = await onSubmit({
          stockQuantity: showStockQuantity ? stockQuantity : null,
          reason: showReason ? reason : null,
          selectedRack: showRackSelection ? selectedRack : null,
          selectedDestinationRack: (session?.user?.role === 'admin' && (destinationProjectId || selectedDestinationProject)) || (transferType === "in" && showRackSelection) ? selectedDestinationRack : null,
          selectedDestinationProject: session?.user?.role === 'admin' && destinationProjectId === "SELECTION_REQUIRED" ? selectedDestinationProject : null,
          selectedSourceProject: transferType === "instant" ? selectedSourceProject : null,
        });
        if (result && result.error) {
          toast.error(result.error);
          return;
        }
        toast.success('Request submitted successfully!');
        handleOpenChange(false);
        setStockQuantity(defaultStockQuantity);
        setReason(defaultReason);
        setSelectedRack("");
        setSelectedDestinationRack("");
        setSelectedDestinationProject("");
        setTimeout(() => {
          window.location.reload();
        }, 600);
      } catch (error) {
        toast.error(error?.message || 'Failed to submit request.');
      } finally {
        setSubmitting(false);
      }
    } else {
    }
  };

  return (
    <Dialog open={actualOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild disabled={disabled}>
        <div
          className={`${triggerClassName} ${disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
        >
          <Icon className={iconClassName} />
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white overflow-visible">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg font-semibold text-center">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-center text-black/50">
              Once admin approved the request the party will notified.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 h-full px-6 py-4 space-y-4 overflow-y-auto">
            {showStockQuantity && (
              <div className="space-y-2">
                <SecondaryInput
                  label={stockQuantityLabel}
                  type="number"
                  value={stockQuantity}
                  onChange={handleStockQuantityChange}
                  min="0"
                  placeholder={stockQuantityPlaceholder}
                  showNumberButtons={true}
                />
              </div>
            )}

            {transferType === "instant" && session?.user?.role === 'admin' && (
              <>
                <div className="relative z-20 w-full">
                  <Label
                    htmlFor="source-project-select"
                    className="absolute bg-white px-1 text-start w-fit -top-1.5 left-3 z-30"
                  >
                    Source Project <span className="text-red-500">*</span>
                  </Label>
                  {availableSourceProjects.length > 0 ? (
                    <Select
                      value={selectedSourceProject}
                      onValueChange={setSelectedSourceProject}
                    >
                      <SelectTrigger
                        className="!h-12 w-full [&_span]:!text-sm rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        id="source-project-select"
                      >
                        <SelectValue placeholder="Select source project" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="bg-white z-[100] [&_span]:!text-sm">
                        {availableSourceProjects.map((project) => (
                          <SelectItem key={project.value} value={project.value}>
                            {project.label} ({project.stockOnHand || 0} units available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="w-full px-3 py-2 text-red-600 border border-red-300 rounded-md bg-red-50">
                      No source projects with stock available
                    </div>
                  )}
                </div>

                {selectedSourceProject && (
                  <div className="relative z-20 w-full">
                    <Label
                      htmlFor="instant-source-rack-select"
                      className="absolute bg-white px-1 text-start w-fit -top-1.5 left-3 z-30"
                    >
                      Source Rack <span className="text-red-500">*</span>
                    </Label>
                    {loadingRacks ? (
                      <div className="w-full px-3 py-2 text-gray-500 border border-gray-300 rounded-md bg-gray-50">
                        Loading source racks...
                      </div>
                    ) : availableRacks.length > 0 ? (
                      <Select
                        value={selectedRack}
                        onValueChange={setSelectedRack}
                        disabled={loadingRacks || availableRacks.length === 0}
                      >
                        <SelectTrigger
                          className="!h-12 w-full [&_span]:!text-sm rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          id="instant-source-rack-select"
                        >
                          <SelectValue placeholder="Select source rack with stock" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="bg-white z-[100] [&_span]:!text-sm">
                          {availableRacks.map((rack) => (
                            <SelectItem key={rack.value} value={rack.value}>
                              {rack.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="w-full px-3 py-2 text-red-600 border border-red-300 rounded-md bg-red-50">
                        No racks with stock found in selected source project
                      </div>
                    )}
                  </div>
                )}

                <div className="relative z-20 w-full">
                  <Label
                    htmlFor="instant-destination-rack-select"
                    className="absolute bg-white px-1 text-start w-fit -top-1.5 left-3 z-30"
                  >
                    Destination Rack <span className="text-red-500">*</span>
                  </Label>
                  {loadingDestinationRacks ? (
                    <div className="w-full px-3 py-2 text-gray-500 border border-gray-300 rounded-md bg-gray-50">
                      Loading destination racks...
                    </div>
                  ) : availableDestinationRacks.length > 0 ? (
                    <Select
                      value={selectedDestinationRack}
                      onValueChange={setSelectedDestinationRack}
                      disabled={loadingDestinationRacks || availableDestinationRacks.length === 0}
                    >
                      <SelectTrigger
                        className="!h-12 w-full [&_span]:!text-sm rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        id="instant-destination-rack-select"
                      >
                        <SelectValue placeholder="Select destination rack" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="bg-white z-[100] [&_span]:!text-sm">
                        {availableDestinationRacks.map((rack) => (
                          <SelectItem key={rack.value} value={rack.value}>
                            {rack.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="w-full px-3 py-2 text-red-600 border border-red-300 rounded-md bg-red-50">
                      No destination racks found for this product
                    </div>
                  )}
                </div>
              </>
            )}

            {showRackSelection && transferType === "out" && (
              <div className="relative z-20 w-full">
                <Label
                  htmlFor="source-rack-select"
                  className="absolute bg-white px-1 text-start w-fit -top-1.5 left-3 z-30"
                >
                  Source Rack <span className="text-red-500">*</span>
                </Label>
                {loadingRacks ? (
                  <div className="w-full px-3 py-2 text-gray-500 border border-gray-300 rounded-md bg-gray-50">
                    Loading racks...
                  </div>
                ) : availableRacks.length > 0 ? (
                  <Select
                    value={selectedRack}
                    onValueChange={setSelectedRack}
                    disabled={loadingRacks || availableRacks.length === 0}
                  >
                    <SelectTrigger
                      className="!h-12 w-full [&_span]:!text-sm rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      id="source-rack-select"
                    >
                      <SelectValue placeholder="Select a rack with available stock" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-white z-[100] [&_span]:!text-sm">
                      {availableRacks.map((rack) => (
                        <SelectItem key={rack.value} value={rack.value}>
                          {rack.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="w-full px-3 py-2 text-red-600 border border-red-300 rounded-md bg-red-50">
                    {sourceProjectId ? 
                      "No racks with available stock found for this product. If you're using Lobby, use 'Request Stock' instead." : 
                      session?.user?.role === 'admin' ? 
                        "No racks with available stock found for this product in any project" :
                        "You are not assigned to any project. Please contact an administrator to assign you to a project before requesting stock transfers."
                    }
                  </div>
                )}
              </div>
            )}

            {session?.user?.role === 'admin' && destinationProjectId === "SELECTION_REQUIRED" && showRackSelection && transferType === "out" && (
              <div className="relative z-20 w-full">
                <Label
                  htmlFor="destination-project-select"
                  className="absolute bg-white px-1 text-start w-fit -top-1.5 left-3 z-30"
                >
                  Destination Project <span className="text-red-500">*</span>
                </Label>
                {availableProjects.length > 0 ? (
                  <Select
                    value={selectedDestinationProject}
                    onValueChange={setSelectedDestinationProject}
                  >
                    <SelectTrigger
                      className="!h-12 w-full [&_span]:!text-sm rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      id="destination-project-select"
                    >
                      <SelectValue placeholder="Select destination project" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-white z-[100] [&_span]:!text-sm">
                      {availableProjects.map((project) => (
                        <SelectItem key={project._id} value={project._id}>
                          {project.projectName} ({project.stockOnHand || 0} units available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="w-full px-3 py-2 text-red-600 border border-red-300 rounded-md bg-red-50">
                    No destination projects available
                  </div>
                )}
              </div>
            )}

            {session?.user?.role === 'admin' && (
              (destinationProjectId && destinationProjectId !== "SELECTION_REQUIRED") || 
              (destinationProjectId === "SELECTION_REQUIRED" && selectedDestinationProject)
            ) && showRackSelection && transferType === "out" && (
              <div className="relative z-20 w-full">
                <Label
                  htmlFor="destination-rack-select"
                  className="absolute bg-white px-1 text-start w-fit -top-1.5 left-3 z-30"
                >
                  Destination Rack <span className="text-red-500">*</span>
                </Label>
                {loadingDestinationRacks ? (
                  <div className="w-full px-3 py-2 text-gray-500 border border-gray-300 rounded-md bg-gray-50">
                    Loading destination racks...
                  </div>
                ) : availableDestinationRacks.length > 0 ? (
                  <Select
                    value={selectedDestinationRack}
                    onValueChange={setSelectedDestinationRack}
                    disabled={loadingDestinationRacks || availableDestinationRacks.length === 0}
                  >
                    <SelectTrigger
                      className="!h-12 w-full [&_span]:!text-sm rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      id="destination-rack-select"
                    >
                      <SelectValue placeholder="Select a destination rack" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-white z-[100] [&_span]:!text-sm">
                      {availableDestinationRacks.map((rack) => (
                        <SelectItem key={rack.value} value={rack.value}>
                          {rack.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="w-full px-3 py-2 text-red-600 border border-red-300 rounded-md bg-red-50">
                    {destinationProjectId === "SELECTION_REQUIRED" && !selectedDestinationProject
                      ? "Please select a destination project first"
                      : "No destination racks found for this product in the selected project"
                    }
                  </div>
                )}
              </div>
            )}

            {transferType === "in" && showRackSelection && (
              <div className="relative z-20 w-full">
                <Label
                  htmlFor="transfer-in-destination-rack-select"
                  className="absolute bg-white px-1 text-start w-fit -top-1.5 left-3 z-30"
                >
                  Destination Rack <span className="text-red-500">*</span>
                </Label>
                {loadingDestinationRacks ? (
                  <div className="w-full px-3 py-2 text-gray-500 border border-gray-300 rounded-md bg-gray-50">
                    Loading destination racks...
                  </div>
                ) : availableDestinationRacks.length > 0 ? (
                  <Select
                    value={selectedDestinationRack}
                    onValueChange={setSelectedDestinationRack}
                    disabled={loadingDestinationRacks || availableDestinationRacks.length === 0}
                  >
                    <SelectTrigger
                      className="!h-12 w-full [&_span]:!text-sm rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      id="transfer-in-destination-rack-select"
                    >
                      <SelectValue placeholder="Select destination rack" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="bg-white z-[100] [&_span]:!text-sm">
                      {availableDestinationRacks.map((rack) => (
                        <SelectItem key={rack.value} value={rack.value}>
                          {rack.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="w-full px-3 py-2 text-red-600 border border-red-300 rounded-md bg-red-50">
                    No destination racks found for your assigned project
                  </div>
                )}
              </div>
            )}

            {showReason && (
              <div className="space-y-2">
                <SecondaryInput
                  label={reasonLabel}
                  type="textarea"
                  rows={reasonRows}
                  value={reason}
                  onChange={handleReasonChange}
                  placeholder={reasonPlaceholder}
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-3 px-6 py-4">
            <Button
              variant="default"
              type="submit"
              className="flex-1 text-white"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center justify-center w-full">
                  <svg className="mr-3 -ml-1 size-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="sr-only">Processing...</span>
                </span>
              ) : (
                submitButtonText
              )}
            </Button>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                {cancelButtonText}
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalDialog;
