"use client";
import React, { useState, useEffect } from "react";
import { Crown } from "lucide-react";
import Breadcrumb from "@/components/primary/manage-users/create-new-user/PrimaryBreadcrumb";
import SecondaryInput from "../shared/secondary-input";
import SecondaryMultiSelect from "../shared/secondary-multi-select";
import SecondarySelect from "../shared/secondary-select";
import { Button } from "../ui/button";
import { toast } from "sonner";

const CreateNewUser = () => {  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    staffId: "",
    selectedProjects: [],
    accessLevel: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch("/api/Projects");
        const data = await response.json();
        
        if (response.ok && data.projects) {
          const formattedProjects = data.projects.map(project => ({
            value: project._id,
            label: project.projectName,
            color: project.color
          }));
          setProjects(formattedProjects);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setProjectsLoading(false);
      }
    };

    fetchProjects();
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
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (formData.phoneNumber && formData.phoneNumber.trim() === "") {
      newErrors.phoneNumber = "Phone number cannot be just whitespace";
    }

    if (!formData.staffId.trim()) {
      newErrors.staffId = "Staff ID is required";
    }

    if (!formData.accessLevel) {
      newErrors.accessLevel = "Access level is required";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Password confirmation is required";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const createUserData = {
        name: formData.fullName,
        email: formData.email,
        contact: formData.phoneNumber || null,
        accessCode: formData.staffId,
        role: formData.accessLevel,
        password: formData.password,
        availableProjects: formData.selectedProjects
      };

      const response = await fetch('/api/Users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createUserData)
      });

      const result = await response.json();      if (response.ok) {
        toast.success(`User "${formData.fullName}" created successfully!`);
        
        setFormData({
          fullName: "",
          email: "",
          phoneNumber: "",
          staffId: "",
          selectedProjects: [],
          accessLevel: "",
          password: "",
          confirmPassword: "",
        });
        setErrors({});
      } else {
        if (response.status === 409) {
          if (result.error.includes("Email")) {
            setErrors({ email: result.error });
          } else if (result.error.includes("Access code")) {
            setErrors({ staffId: result.error });
          } else {
            toast.error(`Failed to create user: ${result.error}`);
          }
        } else {
          toast.error(`Failed to create user: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: "",
      email: "",
      phoneNumber: "",
      staffId: "",
      selectedProjects: [],
      accessLevel: "",
      password: "",
      confirmPassword: "",
    });
    setErrors({});
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="layout-header">
        <h1>Create New User</h1>
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
                />                <SecondaryInput
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
                />                <SecondaryMultiSelect
                  label="Assign Projects"
                  placeholder={projectsLoading ? "Loading projects..." : "Select projects"}
                  value={formData.selectedProjects}
                  onValueChange={(value) =>
                    handleInputChange("selectedProjects", value)
                  }
                  options={projects}
                  disabled={projectsLoading}
                />
                <SecondarySelect
                  label="Access Level"
                  placeholder="Select access level"
                  value={formData.accessLevel}
                  onValueChange={(value) =>
                    handleInputChange("accessLevel", value)
                  }
                  error={errors.accessLevel}
                  required                  options={[
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
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  handleInputChange("password", e.target.value)
                }
                error={errors.password}
                required
              />
              <SecondaryInput
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleInputChange("confirmPassword", e.target.value)
                }
                error={errors.confirmPassword}
                required
              />
            </div>
          </div>
        </div>        <div className="flex items-center justify-start w-full gap-4 mt-6">
          <Button 
            type="submit" 
            variant="default" 
            size="secondary" 
            disabled={loading || projectsLoading}
          >
            {loading ? "Creating User..." : "Create User"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="secondary"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateNewUser;