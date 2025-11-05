"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SecondaryInput from "@/components/shared/secondary-input";
import SecondarySelect from "@/components/shared/secondary-select";
import ManageProjectsBreadcrumb from "@/components/primary/manage-projects/PrimaryBreadcrumb";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox"; 
const EditProjectLayout = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState([]);
  const [existingRacks, setExistingRacks] = useState([]);
  const [newRacks, setNewRacks] = useState([]);

  const [formData, setFormData] = useState({
    projectName: "",
    warehouseLocation: "",
    warehouseManager: "",
    projectColor: "#02399D",
    warehouseCapacity: "",
    warehouseContact: "",
    racks: [],
  });

  const [errors, setErrors] = useState({});
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  useEffect(() => {
    if (!projectId) {
      router.push("/manage-projects");
      return;
    }

    const fetchProjectData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/Projects/${projectId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch project data");
        }

        const data = await response.json();
        if (data.success && data.project) {
          const project = data.project;

          let rackIds = [];
          if (project.racks && Array.isArray(project.racks)) {
            rackIds = project.racks
              .filter((rack) => rack && rack._id) 
              .map((rack) => rack._id.toString());
          }


          setFormData({
            projectName: project.projectName || "",
            warehouseLocation: project.warehouseLocation || "",
            warehouseManager:
              project.warehouseManager?._id || project.warehouseManager || "",
            projectColor: project.color || "#02399D",
            warehouseCapacity: project.warehouseCapacity || "",
            warehouseContact: project.warehouseContact || "",
            racks: rackIds,
          });

          if (Array.isArray(project.racks)) {
            const validRacks = project.racks.filter((rack) => rack && rack._id);
            setExistingRacks(validRacks);
          }
        }
      } catch (error) {
        console.error("Error fetching project data:", error);
      } finally {
        setLoading(false);
      }
    };
    const fetchManagers = async () => {
      try {
        const response = await fetch("/api/Users/managers");

        if (!response.ok) {
          throw new Error("Failed to fetch managers");
        }

        const data = await response.json();

        if (data.managers && Array.isArray(data.managers)) {
          setManagers(data.managers);
        } else {
          console.error("Invalid managers data format:", data);
          setManagers([]);
        }
      } catch (error) {
        console.error("Error fetching managers:", error);
        setManagers([]);
      }
    };

    fetchProjectData();
    fetchManagers();
  }, [projectId, router]);
  const validateForm = () => {
    const newErrors = {};

    if (!formData.projectName.trim()) {
      newErrors.projectName = "Project name is required";
    }




    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
 

  // (removed duplicate setErrors and return outside validateForm)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }
    try {
      const updatedData = {
        projectName: formData.projectName,
        warehouseLocation: formData.warehouseLocation || null,
        warehouseManager: formData.warehouseManager || null,
        color: formData.projectColor,
        warehouseCapacity: formData.warehouseCapacity || null,
        warehouseContact: formData.warehouseContact || null,
        racks: formData.racks,
      };

      const response = await fetch(`/api/Projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();

      if (data.success) {
        if (newRacks.length > 0) {
          const validRacks = newRacks.filter((rack) => rack.rackNumber?.trim());

          if (validRacks.length > 0) {
            const rackResponse = await fetch("/api/Projects/addRacks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                projectId,
                racks: validRacks,
              }),
            });

            const rackData = await rackResponse.json();
          }
        }
        toast.success("Project updated successfully!");
        router.push("/manage-projects");
      } else {
        toast.error(`Failed to update project: ${data.message}`);
      }
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project. Please try again.");
    }
  };
  const handleCancel = () => {
    router.push("/manage-projects");
  };

  const addNewRack = () => {
    setNewRacks((prev) => [
      ...prev,
      { rackNumber: "", location: formData.warehouseLocation, capacity: 100 },
    ]);
  };

  const handleRackChange = (index, field, value) => {
    setNewRacks((prev) =>
      prev.map((rack, i) => (i === index ? { ...rack, [field]: value } : rack))
    );
  };
  const handleExistingRackSelect = (rackId, selected) => {

    setFormData((prev) => {
      const rackIdStr = rackId.toString();

      if (selected) {
        if (!prev.racks.includes(rackIdStr)) {
          const newRacks = [...prev.racks, rackIdStr];
          return {
            ...prev,
            racks: newRacks,
          };
        }
        return prev;
      } else {
        const newRacks = prev.racks.filter((id) => id.toString() !== rackIdStr);
        return {
          ...prev,
          racks: newRacks,
        };
      }
    });
  };
  return (
    <div className="flex flex-col gap-10">
      <div className="layout-header">
        {loading ? (
          <>
            <Skeleton className="w-48 h-8 mb-2" />
            <Skeleton className="w-64 h-5" />
          </>
        ) : (
          <>
            <h1>Edit Project: {formData.projectName}</h1>
            <ManageProjectsBreadcrumb />
          </>
        )}
      </div>

      {loading ? (
        <div className="flex flex-row w-full gap-10">
          <div className="flex flex-col w-full gap-10 p-8 rounded-lg">
            <Skeleton className="w-1/2 h-6 mb-4" />
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="flex flex-row w-full gap-4 mb-2">
                <Skeleton className="w-1/2 h-10" />
                <Skeleton className="w-1/2 h-10" />
              </div>
            ))}
          </div>
          <div className="flex flex-col w-full gap-6 p-8 rounded-lg">
            <Skeleton className="w-1/2 h-6 mb-4" />
            {[...Array(2)].map((_, idx) => (
              <Skeleton key={idx} className="w-full h-10 mb-2" />
            ))}
            <Skeleton className="w-1/2 h-10 mb-2" />
            <Skeleton className="w-1/3 h-10 mb-2" />
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center justify-start w-full"
        >
          <div className="flex flex-row w-full gap-10">
            <div
              className="flex flex-col w-full gap-10 p-8 rounded-lg"
              style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}
            >
              <div className="flex flex-col justify-between gap-5">
                <h2>General Information</h2>
                <div className="flex flex-col w-full gap-4">
                  <div className="flex flex-row w-full gap-4">
                    <SecondaryInput
                      label="Project Name"
                      type="text"
                      value={formData.projectName}
                      onChange={(e) =>
                        handleInputChange("projectName", e.target.value)
                      }
                      error={errors.projectName}
                    />
                    <div className="relative z-20 w-full">
                      <Label
                        htmlFor="project-color"
                        className="absolute bg-white px-1 text-start w-fit -top-1.5 left-3 z-30"
                      >
                        Project Color
                      </Label>
                      <div className="relative">
                        <div
                          className="absolute z-10 w-5 h-5 transform -translate-y-1/2 border border-gray-300 rounded-full cursor-pointer left-3 top-1/2"
                          style={{ backgroundColor: formData.projectColor }}
                          onClick={() =>
                            document.getElementById("color-picker").click()
                          }
                        ></div>
                        <Input
                          type="text"
                          id="project-color"
                          value={formData.projectColor}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                              handleInputChange("projectColor", value);
                            }
                          }}
                          placeholder="#007D51"
                          className="font-mono pl-11"
                        />
                        <input
                          type="color"
                          id="color-picker"
                          value={formData.projectColor}
                          onChange={(e) =>
                            handleInputChange("projectColor", e.target.value)
                          }
                          className="absolute w-0 h-0 opacity-0 pointer-events-none"
                          title="Choose color"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row w-full gap-4">
                    <SecondaryInput
                      label="Warehouse Location"
                      type="text"
                      value={formData.warehouseLocation}
                      onChange={(e) =>
                        handleInputChange("warehouseLocation", e.target.value)
                      }
                      error={errors.warehouseLocation}
                    />
                    <SecondaryInput
                      label="Warehouse Capacity"
                      type="text"
                      value={formData.warehouseCapacity}
                      onChange={(e) =>
                        handleInputChange("warehouseCapacity", e.target.value)
                      }
                      error={errors.warehouseCapacity}
                    />
                  </div>
                  <div className="flex flex-row w-full gap-4">
                    <SecondarySelect
                      label="Warehouse Manager"
                      placeholder="Select a manager"
                      value={formData.warehouseManager || "none"}
                      onValueChange={(value) => {
                        // Convert "none" back to empty string for API
                        const actualValue = value === "none" ? "" : value;
                        handleInputChange("warehouseManager", actualValue);
                      }}
                      options={
                        managers.length > 0
                          ? [{ value: "none", label: "No manager assigned" }, ...managers]
                          : [{ value: "loading", label: "Loading managers..." }]
                      }
                      disabled={managers.length === 0}
                      error={errors.warehouseManager}
                    />
                    <SecondaryInput
                      label="Warehouse Contact"
                      type="tel"
                      value={formData.warehouseContact}
                      onChange={(e) =>
                        handleInputChange("warehouseContact", e.target.value)
                      }
                      error={errors.warehouseContact}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div
              className="flex flex-col w-full gap-6 p-8 rounded-lg"
              style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}
            >
              <div className="flex items-center justify-between">
                <h2>Assigned Racks</h2>
              </div>

              {existingRacks.length > 0 && (
                <div className="flex flex-col gap-3 mb-4">
                  <p className="text-base font-medium">Existing Racks</p>
                  {existingRacks.map((rack) => (
                    <div
                      key={rack._id}
                      className="flex items-center gap-2 px-4 py-3 border rounded-lg"
                    >
                      <Checkbox
                        id={`rack-${rack._id}`}
                        checked={formData.racks.includes(rack._id.toString())}
                        onCheckedChange={(checked) =>
                          handleExistingRackSelect(rack._id, checked)
                        }
                        aria-checked={formData.racks.includes(rack._id.toString())}
                        className="data-[state=checked]:bg-[#0b817f] data-[state=checked]:border-[#0b817f] data-[state=checked]:text-white"
                      />
                      <label htmlFor={`rack-${rack._id}`} className="flex-1">
                        <p className="!text-sm font-normal">{rack.rackNumber}</p>
                 
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {newRacks.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium">New Racks</h3>
                  {newRacks.map((rack, index) => (
                    <div
                      key={`new-rack-${index}`}
                      className="flex flex-col gap-2 p-3 border rounded"
                    >
                      <SecondaryInput
                        label="Rack Number"
                        type="text"
                        value={rack.rackNumber}
                        onChange={(e) =>
                          handleRackChange(index, "rackNumber", e.target.value)
                        }
                      />
                      <SecondaryInput
                        label="Location"
                        type="text"
                        value={rack.location}
                        onChange={(e) =>
                          handleRackChange(index, "location", e.target.value)
                        }
                      />
                      <SecondaryInput
                        label="Capacity"
                        type="number"
                        value={rack.capacity}
                        onChange={(e) =>
                          handleRackChange(index, "capacity", e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={addNewRack}
                className="flex items-center justify-center gap-2 cursor-pointer text-amalfitanAzure"
              >
                <p className="text-lg">+</p>
                <p className="text-sm font-medium">Add new rack</p>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-start w-full gap-4 mt-6">
            <Button type="submit" variant="default" size="secondary">
              Save Details
            </Button>
            <Button
              type="button"
              variant="outline"
              size="secondary"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      {loading && (
        <div className="flex items-center justify-start w-full gap-4 mt-6">
          <Skeleton className="h-10 w-[150px] rounded-md" />
          <Skeleton className="h-10 w-[150px] rounded-md" />
        </div>
      )}
    </div>
  );
};

export default EditProjectLayout;
