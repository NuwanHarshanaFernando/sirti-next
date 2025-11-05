"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Crown } from "lucide-react";
import Breadcrumb from "@/components/primary/manage-users/edit-user/PrimaryBreadcrumb";
import SecondaryInput from "../shared/secondary-input";
import SecondaryMultiSelect from "../shared/secondary-multi-select";
import SecondarySelect from "../shared/secondary-select";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { Skeleton } from "../ui/skeleton";

const EditUserLayout = () => {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    staffId: "",
    selectedProjects: [],
    accessLevel: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [originalUserName, setOriginalUserName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        console.error("No userId provided");
        setLoading(false);
        return;
      }

      try {
        const userResponse = await fetch(`/api/Users/${userId}`);
        const userData = await userResponse.json();
        const projectsResponse = await fetch("/api/Projects");
        const projectsData = await projectsResponse.json(); if (userResponse.ok && userData.user) {
          const user = userData.user;
          setOriginalUserName(user.name);
          setFormData({
            fullName: String(user.name || ""),
            email: String(user.email || ""),
            phoneNumber: String(user.contact || ""),
            staffId: String(user.accessCode || ""),
            selectedProjects: (user.availaleProjects || []).map(id => String(id)),
            accessLevel: user.role || "",
            newPassword: "",
            confirmPassword: "",
          });
        }

        if (projectsResponse.ok && projectsData.projects) {
          const formattedProjects = projectsData.projects.map(project => ({
            value: project._id,
            label: project.projectName,
            color: project.color
          }));
          setProjects(formattedProjects);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

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

    if (!formData.fullName || !formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!formData.email || !formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    } if (formData.phoneNumber && formData.phoneNumber.trim() === "") {
      newErrors.phoneNumber = "Phone number cannot be just whitespace";
    }

    if (!formData.staffId || !formData.staffId.trim()) {
      newErrors.staffId = "Staff ID is required";
    }

    if (!formData.accessLevel) {
      newErrors.accessLevel = "Access level is required";
    }

    if (
      formData.newPassword &&
      formData.newPassword !== formData.confirmPassword
    ) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }
    if (!userId) {
      toast.error("No user ID provided");
      return;
    }

    try {
      const updateData = {
        userId,
        name: formData.fullName,
        email: formData.email,
        contact: formData.phoneNumber,
        accessCode: formData.staffId,
        role: formData.accessLevel,
        availableProjects: formData.selectedProjects,
      };

      if (formData.newPassword) {
        updateData.password = formData.newPassword;
      }

      // Update user document
      const response = await fetch('/api/Users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (response.ok) {
        // --- Update Projects' users array ---
        try {
          // Fetch all projects (to get their current users array and required fields)
          const allProjectsRes = await fetch('/api/Projects');
          const allProjectsData = await allProjectsRes.json();
          if (allProjectsRes.ok && allProjectsData.projects) {
            const selectedSet = new Set(formData.selectedProjects.map(String));
            const userIdStr = String(userId);
            // For each project, update users array as needed
            await Promise.all(
              allProjectsData.projects.map(async (project) => {
                const projectId = project._id;
                // users array may be array of strings or objects
                const usersArr = Array.isArray(project.users)
                  ? project.users.map(u => typeof u === 'object' && u.$oid ? u.$oid : String(u))
                  : [];
                const isUserInProject = usersArr.includes(userIdStr);
                const shouldBeInProject = selectedSet.has(String(projectId));
                // Only update if needed
                if ((shouldBeInProject && !isUserInProject) || (!shouldBeInProject && isUserInProject)) {
                  // Prepare the new users array
                  let updatedUsers;
                  if (shouldBeInProject && !isUserInProject) {
                    updatedUsers = [...usersArr, userIdStr];
                  } else if (!shouldBeInProject && isUserInProject) {
                    updatedUsers = usersArr.filter(uid => uid !== userIdStr);
                  }
                  // Prepare the payload with all required fields for PUT
                  const payload = {
                    projectName: project.projectName,
                    warehouseLocation: project.warehouseLocation || null,
                    warehouseManager: project.warehouseManager && project.warehouseManager.$oid ? project.warehouseManager.$oid : (project.warehouseManager || null),
                    color: project.color || '#E27100',
                    warehouseCapacity: project.warehouseCapacity || null,
                    warehouseContact: project.warehouseContact || null,
                    racks: Array.isArray(project.racks)
                      ? project.racks.map(r => (r && r.$oid ? r.$oid : r))
                      : [],
                    users: updatedUsers
                  };
                  await fetch(`/api/Projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });
                }
              })
            );
          }
        } catch (projErr) {
          console.error('Error updating project user assignments:', projErr);
        }

        toast.success("User updated successfully!");
        setOriginalUserName(formData.fullName);
        setFormData(prev => ({
          ...prev,
          newPassword: "",
          confirmPassword: ""
        }));
      } else {
        toast.error(`Failed to update user: ${result.error}`);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user. Please try again.");
    }
  };
  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel? Any unsaved changes will be lost.")) {
      window.history.back();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-2 layout-header">
          <Skeleton className="w-48 h-8 mb-2" />
          <Skeleton className="w-64 h-5" />
        </div>
        <div className="flex flex-col w-full gap-10 p-8 rounded-lg"
          style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}>
          <div className="flex flex-col justify-between gap-5">
            <Skeleton className="w-40 h-7" />
            <div className="flex flex-col w-full gap-4">
              <div className="flex flex-row w-full gap-4">
                <Skeleton className="h-[76px] w-full" />
                <Skeleton className="h-[76px] w-full" />
                <Skeleton className="h-[76px] w-full" />
              </div>
              <div className="flex flex-row w-full gap-4">
                <Skeleton className="h-[76px] w-full" />
                <Skeleton className="h-[76px] w-full" />
                <Skeleton className="h-[76px] w-full" />
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-5">
            <Skeleton className="w-48 h-7" />
            <div className="flex flex-row w-full gap-4">
              <Skeleton className="h-[76px] w-full" />
              <Skeleton className="h-[76px] w-full" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-start w-full gap-4 mt-6">
          <Skeleton className="w-32 h-10" />
          <Skeleton className="w-24 h-10" />
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-lg text-red-500">No user ID provided</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="layout-header">
        <h1>Edit "{originalUserName || 'User'}"</h1>
        <Breadcrumb />
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center justify-start w-full"
      >
        <div
          className="flex flex-col w-full gap-10 p-8 rounded-lg"
          style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}
        >
          <div className="flex flex-col justify-between gap-5">
            <h2>General Information</h2>
            <div className="flex flex-col w-full gap-4">
              <div className="flex flex-row w-full gap-4">
                <SecondaryInput
                  label="Full Name"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    handleInputChange("fullName", e.target.value)
                  }
                  error={errors.fullName}
                  required
                />
                <SecondaryInput
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  error={errors.email}
                  required
                />
                <SecondaryInput
                  label="Phone Number"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  error={errors.phoneNumber}
                />
              </div>
              <div className="flex flex-row w-full gap-4">
                <SecondaryInput
                  label="Staff ID / Access Code"
                  type="text"
                  value={formData.staffId}
                  onChange={(e) => handleInputChange("staffId", e.target.value)}
                  error={errors.staffId}
                  required
                />
                <SecondaryMultiSelect
                  label="Assign Projects"
                  placeholder="Select projects"
                  value={formData.selectedProjects}
                  onValueChange={(value) =>
                    handleInputChange("selectedProjects", value)
                  }
                  options={projects}
                />
                <SecondarySelect
                  label="Access Level"
                  placeholder="Select access level"
                  value={formData.accessLevel}
                  onValueChange={(value) =>
                    handleInputChange("accessLevel", value)
                  }
                  error={errors.accessLevel}
                  required
                  options={[
                    {
                      value: "admin",
                      label: (
                        <div className="flex items-center gap-2">
                          <Crown
                            className="w-4 h-4 stroke-lemonChrome"
                            strokeWidth={2}
                          />
                          <p className="!text-sm">Admin</p>
                        </div>
                      ),
                    },
                    {
                      value: "manager",
                      label: (
                        <div className="flex items-center gap-2">
                          <Crown
                            className="w-4 h-4 stroke-lustyLavender"
                            strokeWidth={2}
                          />
                          <p className="!text-sm">Manager</p>
                        </div>
                      ),
                    },
                    {
                      value: "staff",
                      label: (
                        <div className="flex items-center gap-2">
                          <Crown
                            className="w-4 h-4 stroke-slate-500"
                            strokeWidth={2}
                          />
                          <p className="!text-sm">Staff</p>
                        </div>
                      ),
                    },
                    {
                      value: "keeper",
                      label: (
                        <div className="flex items-center gap-2">
                          <Crown
                            className="w-4 h-4 stroke-blue-500"
                            strokeWidth={2}
                          />
                          <p className="!text-sm">Keeper</p>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-5">
            <h2>Password Information</h2>
            <div className="flex flex-row w-full gap-4">
              <SecondaryInput
                label="New Password"
                type="password"
                value={formData.newPassword}
                onChange={(e) =>
                  handleInputChange("newPassword", e.target.value)
                }
                error={errors.newPassword}
              />
              <SecondaryInput
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleInputChange("confirmPassword", e.target.value)
                }
                error={errors.confirmPassword}
              />
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

export default EditUserLayout;
