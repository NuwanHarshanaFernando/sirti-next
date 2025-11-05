import React, { useEffect, useState } from "react";
import SecondaryInput from "@/components/shared/secondary-input";
import SecondarySelect from "@/components/shared/secondary-select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ProductImage from "../products/edit-product/ProductImage";
import SecondarySelectWithCreate from "@/components/shared/secondary-select-with-create";
import SecondaryDatePicker from "@/components/shared/secondary-date-picker";
import { generateAndDownloadBarcode } from "@/lib/barcode-generator";

const GeneralInformation = ({
  productName,
  setProductName,
  productCode,
  setProductCode,
  productPrice,
  setProductPrice,
  serviceTerm,
  setServiceTerm,
  productDimensions,
  setProductDimensions,
  productWeight,
  setProductWeight,
  nextServiceDate,
  setNextServiceDate,
  assetManager,
  setAssetManager,
  serialNo,
  setSerialNo,
  manufacturer,
  setManufacturer,
  manufacturerOptions,
  setManufacturerOptions,
  handleProductCodeScanned,
  isEditing = false,
  purchaseDate,
  setPurchaseDate,
  selectedImage,
  setSelectedImage,
  assetManagerOptions,
  productCategory,
  setProductCategory,
  categoryOptions,
  setCategoryOptions,
  attachmentPath,
  setAttachmentPath,
  certificate,
  projectId,
  setProjectId,
  projectOptions,
  status,
  setStatus,
  readOnly = false,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentBase64, setAttachmentBase64] = useState("");
  const [attachmentMime, setAttachmentMime] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  // Dynamically filtered projects based on selected Asset Manager
  const [userProjectOptions, setUserProjectOptions] = useState(null); // null => use provided projectOptions; [] => explicit empty
  const [projectsLoading, setProjectsLoading] = useState(false);
  // Fallback local state for Project selection if parent doesn't provide setter
  const [internalProjectId, setInternalProjectId] = useState("");

  // Helper to normalize Mongo ObjectId from API to string
  const getIdString = (id) => {
    if (!id) return "";
    if (typeof id === "string") return id;
    if (typeof id === "object" && id.$oid) return id.$oid;
    try {
      return id.toString ? id.toString() : String(id);
    } catch (_) {
      return "";
    }
  };

  const handleDownload = () => {
    try {
      const code = (productCode || "").trim();
      if (!code) {
        toast.error("Enter a Product Code first to generate a barcode.");
        return;
      }
      generateAndDownloadBarcode(code, `barcode-${code}.jpg`);
      toast.success("Downloading barcode...");
    } catch (error) {
      toast.error(`Failed to generate barcode: ${error.message}`);
    }
  };

  const handleAttachmentChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setAttachmentFile(file);
    setAttachmentPath("");
    setAttachmentMime(file.type || "");
    setAttachmentName(file.name || "certificate");
    try {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = reader.result || "";
          const base64 = typeof result === "string" && result.includes(",")
            ? result.split(",")[1]
            : "";
          setAttachmentBase64(base64);
        } catch (err) {
          setAttachmentBase64("");
        }
      };
      reader.onerror = () => {
        setAttachmentBase64("");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setAttachmentBase64("");
    }
  };

  const base64ToBlob = (base64, contentType) => {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: contentType });
    } catch (err) {
      return null;
    }
  };

  const triggerDownload = (blob, filename) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleViewCertificate = async () => {
    try {
      let mime = "";
      let base64 = "";
      let name = "certificate";
      if (certificate && certificate.base64) {
        mime = certificate.contentType || "application/pdf";
        base64 = certificate.base64;
        name = (certificate.fileName || "certificate").replace(/\.[^/.]+$/, "");
      } else if (attachmentBase64 && attachmentMime) {
        mime = attachmentMime;
        base64 = attachmentBase64;
        name = (attachmentName || "certificate").replace(/\.[^/.]+$/, "");
      } else if (attachmentPath) {
        window.open(attachmentPath, "_blank", "noopener,noreferrer");
        return;
      } else {
        toast.error("No certificate available to view");
        return;
      }

      if (mime === "application/pdf") {
        const blob = base64ToBlob(base64, "application/pdf");
        triggerDownload(blob, `${name}.pdf`);
        return;
      }

      if (mime.startsWith("image/")) {
        const { default: jsPDF } = await import("jspdf");
        const pdf = new jsPDF();
        const dataUrl = `data:${mime};base64,${base64}`;
        try {
          pdf.addImage(dataUrl, "JPEG", 10, 10, 190, 0);
        } catch (e1) {
          try {
            pdf.addImage(dataUrl, "PNG", 10, 10, 190, 0);
          } catch (e2) {
            pdf.text("Attachment could not be rendered as image.", 10, 20);
            pdf.text("Please download the original file.", 10, 28);
          }
        }
        const blob = pdf.output("blob");
        triggerDownload(blob, `${name}.pdf`);
        return;
      }

      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF();
      pdf.text("Unsupported certificate type.", 10, 20);
      const blob = pdf.output("blob");
      triggerDownload(blob, `${name}.pdf`);
    } catch (err) {
      toast.error("Failed to open certificate");
    }
  };

  const handleSparkles = async () => {
    let loadingToastId;
    try {
      loadingToastId = toast.loading("Generating unique product code...");

      const response = await fetch("/api/generate-product-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProductCode(data.code);

        toast.dismiss(loadingToastId);
        toast.success(`Unique product code generated: ${data.code}`);
      } else {
        const errorData = await response.json();
        console.error("API Error Response:", errorData);

        toast.dismiss(loadingToastId);
        toast.error(
          errorData.error ||
          "Failed to generate unique product code. Please try again."
        );
      }
    } catch (error) {
      console.error("Network/Parse Error:", error);
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }
      toast.error(`Failed to generate unique product code: ${error.message}`);
    }
  };

  const serviceTermOptions = [
    { value: "30-days", label: "30 Days" },
    { value: "60-days", label: "60 Days" },
    { value: "90-days", label: "90 Days" },
    { value: "180-days", label: "180 Days" },
    { value: "365-days", label: "365 Days" },
    { value: "730-days", label: "730 Days" },
    { value: "1095-days", label: "1095 Days" },
    { value: "1460-days", label: "1460 Days" },
    { value: "1825-days", label: "1825 Days" },
    { value: "lifetime", label: "Lifetime" },
    { value: "no-warranty", label: "No Warranty" },
  ];

  const handleSaveDetails = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      let calculatedServiceDate = "";
      if (
        (!nextServiceDate || nextServiceDate === "") && purchaseDate && serviceTerm && serviceTerm.endsWith("-days")
      ) {
        const calcDate = addDays(
          new Date(purchaseDate),
          parseInt(serviceTerm.split("-")[0], 10)
        );
        calculatedServiceDate = calcDate.toISOString().split("T")[0];
      }
      let uploadedAttachmentPath = attachmentPath;
      const certificate = (attachmentBase64 && attachmentMime)
        ? {
          fileName: attachmentName || "certificate",
          contentType: attachmentMime,
          base64: attachmentBase64,
          size: attachmentFile?.size || undefined,
        }
        : undefined;

      const chosenProjectId =
        getIdString(
          typeof setProjectId === "function" ? projectId : internalProjectId
        ) || null;

      const assetData = {
        productName,
        productCode,
        productValue: Number(productPrice),
        serviceTerm,
        serialNumber: serialNo,
        manufacture: manufacturer,
        purchaseDate: purchaseDate || "",
        category: productCategory || "",
        nextServiceDate: nextServiceDate || calculatedServiceDate,
        dimensions: productDimensions,
        weight: productWeight,
        assetsManager: assetManager,
        productImage: selectedImage,
        attachmentPath: uploadedAttachmentPath || "",
        certificate: certificate,
        projectId: chosenProjectId,
        status: status || "Operational",
      };
      if (isEditing && typeof window !== "undefined") {
        const url = new URL(window.location.href);
        let assetId = null;
        const match = url.pathname.match(/edit-asset\/?([a-fA-F0-9]{24})/);
        if (match && match[1]) {
          assetId = match[1];
        } else if (url.searchParams.get("id")) {
          assetId = url.searchParams.get("id");
        }
        if (!assetId) {
          toast.error("Asset ID not found in URL.");
          return;
        }
        const response = await fetch("/api/assets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: assetId, updateData: assetData }),
        });
        if (response.ok) {

          toast.success("Asset updated successfully!");
          handleCancel();
        } else {
          const errorData = await response.json();
          toast.error(errorData.error || "Failed to update asset.");
        }
      } else {
        const response = await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assetData),
        });
        if (response.ok) {
          toast.success("Asset saved successfully!");
          handleCancel();
        } else {
          const errorData = await response.json();
          toast.error(errorData.error || "Failed to save asset.");
        }
      }
    } catch (error) {
      toast.error(`Failed to save asset: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };
  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  const handleCancel = () => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  // Keep internal selection roughly in sync with prop when available
  useEffect(() => {
    const incoming = getIdString(projectId) || "";
    setInternalProjectId((prev) => (prev !== incoming ? incoming : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // When an Asset Manager is selected while adding a new asset, fetch their owned/available projects
  useEffect(() => {
    let aborted = false;
    async function fetchUserProjects(userId) {
      if (!userId) return;
      try {
        setProjectsLoading(true);
        // Only filter on create flow; keep existing value on edit to avoid unintended changes
        if (isEditing) return;
        const res = await fetch(`/api/Users/${userId}`);
        if (!res.ok) {
          // Revert to global list on failure
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || "Failed to load user's projects");
          if (!aborted) setUserProjectOptions(null);
          return;
        }
        const data = await res.json();
        const projects = data?.user?.availableProjects || [];
        // Update options; if none, set to empty array to show empty list
        if (!aborted) setUserProjectOptions(projects);
        // Notify when no projects are available for the selected user
        if (!aborted && projects.length === 0) {
          toast.info(
            "Selected user's project list is empty. Please assign projects or choose a different manager."
          );
        }
        // If current projectId is not in new list, clear it
        if (!aborted) {
          const contains = projects.some((p) => getIdString(p._id) === getIdString(projectId));
          if (!contains) {
            if (typeof setProjectId === "function") setProjectId("");
            else setInternalProjectId("");
          }
        }
      } catch (e) {
        if (!aborted) {
          setUserProjectOptions(null); // fallback to provided list
          toast.error("Unable to fetch user's projects");
        }
      } finally {
        if (!aborted) setProjectsLoading(false);
      }
    }
    if (assetManager && !readOnly) {
      fetchUserProjects(assetManager);
    } else {
      // No manager selected or readOnly: use original projectOptions
      setUserProjectOptions(null);
    }
    return () => {
      aborted = true;
    };
  }, [assetManager, isEditing, readOnly]);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-5">
        <div
          className="flex flex-col justify-between w-2/3 gap-5 p-8 rounded-lg"
          style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}
        >
          <div className="flex flex-row gap-4">
            <SecondaryInput
              label="Product Name"
              value={productName}
              onChange={(e) => !readOnly && setProductName(e.target.value)}
              disabled={readOnly}
            />
            <SecondaryInput
              label="Product Code"
              value={productCode}
              onChange={(e) => !readOnly && setProductCode(e.target.value)}
              showQrScanner={!isEditing}
              onScan={handleProductCodeScanned}
              showDownload={true}
              onDownload={handleDownload}
              showSparkles={!isEditing}
              onSparkles={handleSparkles}
              disabled={isEditing || readOnly}
              enableActionsWhenDisabled={true}
              className={isEditing ? "opacity-60" : ""}
            />
          </div>
          <div className="flex flex-row gap-4">
            <SecondaryInput
              label="Product Value"
              value={productPrice}
              onChange={(e) => !readOnly && setProductPrice(e.target.value)}
              disabled={readOnly}
            />
            <SecondarySelect
              label="Service Term"
              options={serviceTermOptions}
              value={serviceTerm}
              onValueChange={(v) => !readOnly && setServiceTerm(v)}
              className="w-1/2"
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-row gap-4">
            <SecondaryInput
              label="Serial Number"
              value={serialNo}
              onChange={(e) => !readOnly && setSerialNo(e.target.value)}
              disabled={readOnly}
            />
            <SecondarySelectWithCreate
              label="Manufacturer"
              placeholder="Select or type manufacturer"
              value={manufacturer}
              onValueChange={(v) => !readOnly && setManufacturer(v)}
              options={manufacturerOptions}
              setOptions={setManufacturerOptions}
              allowCreate={true}
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-row gap-4">
            <SecondaryInput
              label="Dimensions"
              value={productDimensions}
              onChange={(e) => !readOnly && setProductDimensions(e.target.value)}
              disabled={readOnly}
            />
            <SecondaryInput
              label="Weight"
              value={productWeight}
              onChange={(e) => !readOnly && setProductWeight(e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-row gap-4">
            <SecondarySelectWithCreate
              label="Asset Category"
              placeholder="Select or type category"
              value={productCategory}
              onValueChange={(v) => !readOnly && setProductCategory(v)}
              options={categoryOptions}
              setOptions={setCategoryOptions}
              allowCreate={true}
              disabled={readOnly}
            />
            <SecondarySelect
              label="Asset Manager"
              options={assetManagerOptions}
              value={assetManager ? assetManager : ""}
              onValueChange={async (v) => {
                if (readOnly) return;
                // Reset project selection when manager changes
                if (typeof setProjectId === "function") {
                  setProjectId("");
                } else {
                  setInternalProjectId("");
                }
                setAssetManager(v);
              }}
              className="w-1/2"
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-row gap-4">
            <SecondarySelect
              label="Project"
              options={
                ((userProjectOptions ?? projectOptions) || []).map((p) => ({
                  value: getIdString(p._id),
                  label: p.projectName,
                }))
              }
              value={
                getIdString(
                  typeof setProjectId === "function" ? projectId : internalProjectId
                ) || ""
              }
              onValueChange={(v) => {
                if (readOnly) return;
                if (typeof setProjectId === "function") setProjectId(v);
                else setInternalProjectId(v);
              }}
              className="w-1/2"
              disabled={readOnly || projectsLoading}
            />
            <SecondarySelect
              label="Status"
              options={[
                { value: "Operational", label: "Operational" },
                { value: "Under Maintain", label: "UNDER Maintain" },
                { value: "Broken", label: "Broken" },
                { value: "Stolen", label: "Stolen" },
              ]}
              value={status}
              onValueChange={(v) => !readOnly && setStatus(v)}
              className="w-1/2"
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-row gap-4">
            <SecondaryDatePicker
              label="Purchase Date"
              placeholder="Select Purchase Date"
              mode="single"
              dateRange={purchaseDate ? new Date(purchaseDate) : undefined}
              onDateRangeChange={(date) =>
                !readOnly && setPurchaseDate(date ? date.toISOString().split("T")[0] : "")
              }
              className="w-1/2 !h-12"
              disabled={readOnly}
            />
            {(() => {
              let calculatedServiceDate = undefined;
              if (
                !nextServiceDate && purchaseDate && serviceTerm && serviceTerm.endsWith("-days")
              ) {
                calculatedServiceDate = addDays(
                  new Date(purchaseDate),
                  parseInt(serviceTerm.split("-")[0], 10)
                );
              }
              return (
                <SecondaryDatePicker
                  label="Service Date"
                  placeholder="Select Service Date"
                  mode="single"
                  dateRange={
                    nextServiceDate && nextServiceDate !== ""
                      ? new Date(nextServiceDate)
                      : calculatedServiceDate
                  }
                  onDateRangeChange={(date) =>
                    !readOnly &&
                    setNextServiceDate(date ? date.toISOString().split("T")[0] : "")
                  }
                  className="w-1/2"
                  disabled={readOnly}
                />
              );
            })()}
          </div>
          <div className="flex flex-row items-end gap-4">
            <SecondaryInput
              label={attachmentPath ? "Reupload Certificate" : "Certificate"}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleAttachmentChange}
              className="items-center justify-center flex-1"
              disabled={readOnly}
            />
            {(certificate?.base64 || attachmentBase64 || attachmentPath) && (
              <Button
                type="button"
                variant="secondary"
                size="default"
                className="h-12"
                onClick={handleViewCertificate}
              >
                View Certificate
              </Button>
            )}
          </div>
        </div>
        <div
          className="flex flex-col justify-between w-1/3 gap-5 p-8 rounded-lg"
          style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}
        >
          <ProductImage
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
          />
        </div>
      </div>
      {!readOnly && (
        <div className="flex items-start justify-start gap-2">
          <Button
            onClick={handleSaveDetails}
            variant="default"
            size="default"
            className="w-[150px]"
            disabled={isSaving}
          >
            {isSaving && (
              <svg
                className="mr-3 -ml-1 text-white size-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            Save Details
          </Button>
          <Button
            variant="outline"
            size="default"
            className="w-[150px]"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default GeneralInformation;