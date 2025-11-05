"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SecondaryInput from "@/components/shared/secondary-input";
import SecondarySelect from "@/components/shared/secondary-select";
import ManageProjectsBreadcrumb from "@/components/primary/manage-projects/PrimaryBreadcrumb";

const EditProjectLayout = () => {
  const managerOptions = [
    { value: "john_doe", label: "John Doe" },
    { value: "jane_smith", label: "Jane Smith" },
    { value: "mike_johnson", label: "Mike Johnson" },
    { value: "sarah_wilson", label: "Sarah Wilson" },
    { value: "david_brown", label: "David Brown" },
  ];

  const [formData, setFormData] = useState({
    projectName: "Project A",
    warehouseLocation: "",
    warehouseManager: "",
    projectColor: "#02399D",
    warehouseCapacity: "",
    warehouseContact: "",
    racks: ["", ""],
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
  const validateForm = () => {
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
    }

    if (!formData.warehouseContact.trim()) {
      newErrors.warehouseContact = "Warehouse contact is required";
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
      alert("Project updated successfully!");
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Failed to update project. Please try again.");
    }
  };
  const handleCancel = () => {
    setFormData({
      projectName: "Project A",
      warehouseLocation: "",
      warehouseManager: "",
      projectColor: "",
      warehouseCapacity: "",
      warehouseContact: "",
      racks: ["", ""],
    });
    setErrors({});
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
        <h1>Edit "Project A"</h1>
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
                    type="text"
                    value={formData.warehouseCapacity}
                    onChange={(e) =>
                      handleInputChange("warehouseCapacity", e.target.value)
                    }
                    error={errors.warehouseCapacity}
                  />
                </div>                <div className="flex flex-row w-full gap-4">
                  <SecondarySelect
                    label="Warehouse Manager"
                    placeholder="Select a manager"
                    value={formData.warehouseManager}
                    onValueChange={(value) =>
                      handleInputChange("warehouseManager", value)
                    }
                    options={managerOptions}
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
              <h2>Assigned Projects</h2>
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
    </div>
  );
};

export default EditProjectLayout;
