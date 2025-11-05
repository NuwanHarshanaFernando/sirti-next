"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SecondaryInput from "@/components/shared/secondary-input";
import SecondarySelect from "@/components/shared/secondary-select";
import ManageProjectsBreadcrumb from "@/components/primary/manage-projects/PrimaryBreadcrumb";
import { toast } from "sonner";

const EditProjectLayout = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [managerOptions, setManagerOptions] = useState([]);
  const [allRacks, setAllRacks] = useState([]);

  const [formData, setFormData] = useState({
    projectName: "",
    warehouseLocation: "",
    warehouseManager: "",
    projectColor: "#02399D",
    warehouseCapacity: "",
    warehouseContact: "",
    racks: ["", ""],
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (projectId) {
      fetchProjectData(projectId);
      fetchManagerOptions();
      fetchAllRacks();
    } else {
      setError("No project ID provided");
      setLoading(false);
    }
  }, [projectId]);

  const fetchProjectData = async (id) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/Projects/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project data');
      }
      
      const projectData = await response.json();
      
      setFormData({
        projectName: projectData.projectName || "",
        warehouseLocation: projectData.warehouseLocation || "",
        warehouseManager: projectData.warehouseManager?._id || "",
        projectColor: projectData.color || "#02399D",
        warehouseCapacity: projectData.warehouseCapacity?.toString() || "",
        warehouseContact: projectData.warehouseContact || "",
        racks: projectData.racks?.map(rack => rack._id) || ["", ""],
      });
      
    } catch (error) {
      console.error('Error fetching project data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagerOptions = async () => {
    try {
      const response = await fetch('/api/Users');
      if (response.ok) {
        const data = await response.json();
        const managers = data.users?.map(user => ({
          value: user._id,
          label: `${user.firstName} ${user.lastName}`
        })) || [];
        setManagerOptions(managers);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const fetchAllRacks = async () => {
    try {
      const response = await fetch('/api/Racks');
      if (response.ok) {
        const data = await response.json();
        setAllRacks(data.racks || []);
      }
    } catch (error) {
      console.error('Error fetching racks:', error);
    }
  };

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

  const addRack = () => {
    setFormData((prev) => ({
      ...prev,
      racks: [...prev.racks, ""],
    }));
  };

  const removeRack = (index) => {
    setFormData((prev) => ({
      ...prev,
      racks: prev.racks.filter((_, i) => i !== index),
    }));
  };

  const handleRackChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      racks: prev.racks.map((rack, i) => (i === index ? value : rack)),
    }));
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
      setLoading(true);

      const validRacks = formData.racks.filter(rack => rack.trim() !== "");

      const updateData = {
        projectName: formData.projectName,
        warehouseLocation: formData.warehouseLocation,
        warehouseManager: formData.warehouseManager,
        color: formData.projectColor,
        warehouseCapacity: formData.warehouseCapacity,
        warehouseContact: formData.warehouseContact,
        racks: validRacks
      };

      const response = await fetch(`/api/Projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update project');
      }

      toast.success("Project updated successfully!");
      router.push('/manage-projects');
      
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error(`Failed to update project: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/manage-projects');
  };

  const handleAddNewRacks = async () => {
    const emptyRacks = formData.racks.filter(rack => rack === "");
    
    if (emptyRacks.length === 0) {
      toast.error("Please add some rack slots first by clicking 'Add Rack'");
      return;
    }

    const rackData = emptyRacks.map((_, index) => ({
      rackNumber: `RACK-${Date.now()}-${index + 1}`,
      location: formData.warehouseLocation,
      capacity: 100
    }));

    try {
      const response = await fetch('/api/Projects/addRacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          racks: rackData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add racks');
      }

      const result = await response.json();
      toast.success(`${result.racks.length} new racks created successfully!`);
      
      await fetchProjectData(projectId);
      await fetchAllRacks();
      
    } catch (error) {
      console.error("Error adding racks:", error);
      toast.error(`Failed to add racks: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-lg">Loading project data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error}</div>
        <button 
          onClick={() => router.push('/manage-projects')}
          className="px-4 py-2 mt-4 text-white bg-blue-500 rounded"
        >
          Back to Manage Projects
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between w-full">
        <div className="layout-header">
          <h1>Edit "{formData.projectName || 'Project'}"</h1>
          <ManageProjectsBreadcrumb />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div
          className="flex flex-col gap-6 p-8 rounded-lg"
          style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}
        >
          <h2 className="text-xl font-semibold">Project Information</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="projectName">Project Name</Label>
              <SecondaryInput
                id="projectName"
                placeholder="Enter project name"
                value={formData.projectName}
                onChange={(e) => handleInputChange("projectName", e.target.value)}
                error={errors.projectName}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="warehouseLocation">Warehouse Location</Label>
              <SecondaryInput
                id="warehouseLocation"
                placeholder="Enter warehouse location"
                value={formData.warehouseLocation}
                onChange={(e) => handleInputChange("warehouseLocation", e.target.value)}
                error={errors.warehouseLocation}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="warehouseManager">Warehouse Manager</Label>
              <SecondarySelect
                id="warehouseManager"
                placeholder="Select warehouse manager"
                options={managerOptions}
                value={formData.warehouseManager}
                onValueChange={(value) => handleInputChange("warehouseManager", value)}
                error={errors.warehouseManager}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="projectColor">Project Color</Label>
              <Input
                id="projectColor"
                type="color"
                value={formData.projectColor}
                onChange={(e) => handleInputChange("projectColor", e.target.value)}
                className="w-full h-10"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="warehouseCapacity">Warehouse Capacity</Label>
              <SecondaryInput
                id="warehouseCapacity"
                placeholder="Enter warehouse capacity"
                type="number"
                value={formData.warehouseCapacity}
                onChange={(e) => handleInputChange("warehouseCapacity", e.target.value)}
                error={errors.warehouseCapacity}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="warehouseContact">Warehouse Contact</Label>
              <SecondaryInput
                id="warehouseContact"
                placeholder="Enter warehouse contact"
                value={formData.warehouseContact}
                onChange={(e) => handleInputChange("warehouseContact", e.target.value)}
                error={errors.warehouseContact}
              />
            </div>
          </div>
        </div>

        <div
          className="flex flex-col gap-6 p-8 rounded-lg"
          style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Rack Configuration</h2>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRack}
              >
                Add Rack Slot
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddNewRacks}
              >
                Create New Racks
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {formData.racks.map((rack, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor={`rack-${index}`}>Rack {index + 1}</Label>
                  <SecondarySelect
                    id={`rack-${index}`}
                    placeholder="Select existing rack or leave empty to create new"
                    options={allRacks.map(r => ({
                      value: r._id,
                      label: `${r.rackNumber} (${r.location})`
                    }))}
                    value={rack}
                    onValueChange={(value) => handleRackChange(index, value)}
                  />
                </div>
                {formData.racks.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeRack(index)}
                    className="mt-6"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            type="submit"
            variant="default"
            size="secondary"
            className="w-[150px]"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="secondary"
            className="w-[150px]"
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
