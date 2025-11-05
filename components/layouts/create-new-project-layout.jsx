"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SecondaryInput from "@/components/shared/secondary-input";
import SecondarySelect from "@/components/shared/secondary-select";
import ManageProjectsBreadcrumb from "@/components/primary/manage-projects/PrimaryBreadcrumb";
import { toast } from "sonner";

const CreateNewProject = () => {
  const router = useRouter();
  const [managerOptions, setManagerOptions] = useState([]);
  const [isLoadingManagers, setIsLoadingManagers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    projectName: "",
    warehouseLocation: "",
    warehouseManager: "",
    projectColor: "#02399D",
    warehouseCapacity: "",
    warehouseContact: "",
    racks: [""],
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        setIsLoadingManagers(true);
        const response = await fetch("/api/Users/managers");
        const data = await response.json();

        if (response.ok) {
          setManagerOptions(data.managers);
        } else {
          console.error("Error fetching managers:", data.error);
        }
      } catch (error) {
        console.error("Error fetching managers:", error);
      } finally {
        setIsLoadingManagers(false);
      }
    };

    fetchManagers();
  }, []);

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
  }; const validateForm = () => {
    const newErrors = {};

    if (!formData.projectName.trim()) {
      newErrors.projectName = "Project name is required";
    }

    if (!formData.warehouseLocation.trim()) {
      newErrors.warehouseLocation = "Warehouse location is required";
    }

    if (!formData.warehouseManager.trim()) {
      newErrors.warehouseManager = "Warehouse manager is required";
    }

    if (!formData.warehouseCapacity.trim()) {
      newErrors.warehouseCapacity = "Warehouse capacity is required";
    } else if (isNaN(formData.warehouseCapacity) || parseInt(formData.warehouseCapacity) <= 0) {
      newErrors.warehouseCapacity = "Warehouse capacity must be a positive number";
    }

    if (!formData.warehouseContact.trim()) {
      newErrors.warehouseContact = "Warehouse contact is required";
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(formData.warehouseContact)) {
      newErrors.warehouseContact = "Please enter a valid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/Projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          color: formData.projectColor,
        })
      });

      const data = await response.json(); if (response.ok) {
        toast.success("Project created successfully!");
        router.push("/manage-projects");
      } else {
        if (data.error === "Project name already exists") {
          setErrors({ projectName: "Project name already exists" });
        } else if (data.error === "Selected manager not found or doesn't have appropriate permissions") {
          setErrors({ warehouseManager: "Selected manager is invalid" });
        } else {
          toast.error(`Failed to create project: ${data.error}`);
        }
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }; const handleCancel = () => {
    router.push("/manage-projects");
  };
  const addNewRack = () => {
    setFormData((prev) => ({
      ...prev,
      racks: [...prev.racks, ""],
    }));
  };

  const handleRackChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      racks: prev.racks.map((rack, i) => (i === index ? value : rack)),
    }));
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="layout-header">
        <h1>Create New Project</h1>
        <ManageProjectsBreadcrumb />
      </div>
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
                    type="number"
                    value={formData.warehouseCapacity}
                    onChange={(e) =>
                      handleInputChange("warehouseCapacity", e.target.value)
                    }
                    error={errors.warehouseCapacity}
                    placeholder="Enter capacity"
                  />
                </div>
                <div className="flex flex-row w-full gap-4">
                  <SecondarySelect
                    label="Warehouse Manager"
                    placeholder={isLoadingManagers ? "Loading managers..." : "Select a manager"}
                    value={formData.warehouseManager}
                    onValueChange={(value) =>
                      handleInputChange("warehouseManager", value)
                    }
                    options={managerOptions}
                    error={errors.warehouseManager}
                    disabled={isLoadingManagers}
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
              <h2>Warehouse Racks</h2>
            </div>
            <div className="flex flex-col gap-3">
              {formData.racks.map((rack, index) => (
                <SecondaryInput
                  key={index}
                  label={`Rack ${index + 1}`}
                  type="text"
                  value={rack}
                  onChange={(e) => handleRackChange(index, e.target.value)}
                />
              ))}
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
        </div>        <div className="flex items-center justify-start w-full gap-4 mt-6">
          <Button
            type="submit"
            variant="default"
            size="secondary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Save Details"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateNewProject;
