"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import Breadcrumb from "@/components/primary/settings/PrimaryBreadcrumb";
import SecondaryInput from "@/components/shared/secondary-input";
import SecondarySelect from "@/components/shared/secondary-select";
import ImportProductsModal from "@/components/primary/settings/ImportProductsModal";
import { useState } from "react";
import { FileSpreadsheet, Loader } from "lucide-react";

const SettingsLayout = () => {
  const [formData, setFormData] = useState({
    emails: [""],
    lowStockThreshold: "",
    frequency: "PerMonth",
    usageReport: "TwiceAWeek",
  });

  const [errors, setErrors] = useState({});
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleEmailChange = (index, value) => {
    const updatedEmails = [...formData.emails];
    updatedEmails[index] = value;
    setFormData({ ...formData, emails: updatedEmails });
  }; const addNewEmail = () => {
    setFormData({ ...formData, emails: [...formData.emails, ""] });
  };

  const handleImportStarted = () => {
    setIsImporting(true);
  };

  const handleImportComplete = () => {
    setIsImporting(false);
  };
  const validateForm = () => {
    const newErrors = {};

    formData.emails.forEach((email, index) => {
      if (!email.trim()) {
        newErrors[`email_${index}`] = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        newErrors[`email_${index}`] = "Please enter a valid email";
      }
    });

    if (!formData.lowStockThreshold.trim()) {
      newErrors.lowStockThreshold = "Low stock threshold is required";
    }
    if (!formData.frequency) {
      newErrors.frequency = "Frequency is required";
    }

    if (!formData.usageReport) {
      newErrors.usageReport = "Usage report frequency is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between w-full">
        <div className="layout-header">
          <h1>Settings</h1>
          <Breadcrumb />
        </div>
      </div>
      <div className="flex flex-col items-start justify-start w-full">
        <div className="flex flex-col w-full gap-6">
          <p className="text-base font-medium text-black">
            Upload Excel file with the 11-column structure: SKU, Item Type, Item Description, Serial No, Location, UOM, QTY In, QTY Out, QTY Remaining, Project Name, Remarks. Projects from the Project column will be automatically included for filtering access.
          </p>
          <div className="flex flex-row gap-4 pb-4 border-b border-gray-200">
            <div className="flex flex-col w-[170px]">
              <p className="font-medium">Import Products</p>
              <p className="text-sm text-gray-600">Import products from Excel file</p>
            </div>
            <div className="flex flex-col gap-2 w-[300px]">
              <Button
                variant="outline"
                onClick={() => setShowImportModal(true)}
                className="flex items-center justify-start gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Import Products
              </Button>

            </div>

          </div>

          <div className="flex flex-row gap-4">
            <div className="flex flex-col w-[170px]">
              <p>Email Notifications</p>
              <Button
                variant="link"
                size="link"
                className=""
                onClick={addNewEmail}
                type="button"
              >
                + Add new mail
              </Button>
            </div>
            <div className="flex flex-col gap-2 w-[300px]">
              {formData.emails.map((email, index) => (
                <SecondaryInput
                  key={index}
                  label={index === 0 ? "Email Address" : ""}
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  error={errors[`email_${index}`]}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-row gap-4">
            <div className="flex flex-col w-[170px]">
              <p>Low Stock Threshold</p>
            </div>
            <div className="flex flex-col gap-2 w-[300px]">
              <SecondaryInput label="Add Threshold" type="number" />
            </div>
          </div>
          <div className="flex flex-row gap-4">
            <div className="flex flex-col w-[170px]">
              <p>Stock Report</p>
            </div>
            <div className="flex flex-col gap-2 w-[300px]">
              <SecondarySelect
                label="Choose Frequency"
                value={formData.frequency}
                onValueChange={(value) => handleInputChange("frequency", value)}
                error={errors.frequency}
                options={[
                  {
                    value: "PerMonth",
                    label: <p className="!text-sm">Per Month</p>,
                  },
                  {
                    value: "PerWeek",
                    label: <p className="!text-sm">Per Week</p>,
                  },
                ]}
              />
            </div>
          </div>
          <div className="flex flex-row gap-4">
            <div className="flex flex-col w-[170px]">
              <p>Usage Report</p>
            </div>
            <div className="flex flex-col gap-2 w-[300px]">
              <SecondarySelect
                label="Choose Frequency"
                value={formData.usageReport}
                onValueChange={(value) =>
                  handleInputChange("usageReport", value)
                }
                error={errors.usageReport}
                options={[
                  {
                    value: "TwiceAWeek",
                    label: <p className="!text-sm">Twice a Week</p>,
                  },
                  {
                    value: "PerWeek",
                    label: <p className="!text-sm">Per Week</p>,
                  },
                ]}
              />
            </div>
          </div>
        </div>        <Button variant="default" size="secondary" className="mt-6">
          Save & Apply
        </Button>
      </div>
      <ImportProductsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
        onImportStarted={handleImportStarted}
      />
      {isImporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
          <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-lg">
            <Loader className="w-8 h-8 mb-4 text-primary animate-spin" />
            <h3 className="text-lg font-medium">Importing Products</h3>
            <p className="mt-2 text-gray-600">Please wait while products are being imported...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsLayout;
