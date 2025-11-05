"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/primary/products/add-new-product/PrimaryBreadcrumb";
import GeneralInformation from "@/components/primary/products/edit-product/GeneralInformation";
import ProductImage from "@/components/primary/products/edit-product/ProductImage";
import { Button } from "@/components/ui/button";
import { FilePlus2, Loader2 } from "lucide-react";
import Link from "next/link";
import SearchBarcode from "@/components/shared/search-barcode-input";
import { toast } from "sonner";
import DeleteDialog from "@/components/popups/DeleteDialog";

const AddNewProductLayout = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [productCode, setProductCode] = useState("");
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productWeight, setProductWeight] = useState("");
  const [productDimensions, setProductDimensions] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [includedProjects, setIncludedProjects] = useState([]);
  const [includedProjectsOptions, setIncludedProjectsOptions] = useState([]);
  const [overwriteThreshold, setOverwriteThreshold] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [unit, setUnit] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [projectsInfo, setProjectsInfo] = useState([]);
  const [projectRackOptions, setProjectRackOptions] = useState({});
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const ensureUnitInOptions = (currentUnit, options) => {
    if (!currentUnit || !options || !Array.isArray(options)) return;

    const lowerCurrentUnit = currentUnit.toLowerCase();

    const unitExists = options.some(option =>
      option.value && option.value.toLowerCase() === lowerCurrentUnit
    );

    if (!unitExists) {
      const newOption = {
        value: lowerCurrentUnit,
        label: currentUnit.charAt(0).toUpperCase() + currentUnit.slice(1).toLowerCase()
      };
      setUnitOptions(prevOptions => [...prevOptions, newOption]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectsResponse = await fetch("/api/Projects");
        const projectsData = await projectsResponse.json();

        const categoriesResponse = await fetch("/api/Products/categories");
        const categoriesData = await categoriesResponse.json();

        if (categoriesData.categories) {
          setCategoryOptions(categoriesData.categories);
        }

        try {
          const unitsResponse = await fetch("/api/Products/units");

          if (!unitsResponse.ok) {
            console.error("Units API response not ok:", unitsResponse.status, unitsResponse.statusText);
            throw new Error(`Units API returned ${unitsResponse.status}`);
          }

          const unitsData = await unitsResponse.json();

          if (unitsData.units && Array.isArray(unitsData.units)) {
            setUnitOptions(unitsData.units);

            if (unit && unit.trim() !== "") {
              ensureUnitInOptions(unit, unitsData.units);
            }
          } else {
            console.warn("No units found in response or units is not an array");
            setUnitOptions([]);
          }
        } catch (error) {
          console.error("Error fetching units:", error);
          setUnitOptions([
            { value: "pcs", label: "Pieces" },
            { value: "kg", label: "Kilograms" },
            { value: "l", label: "Liters" }
          ]);
        }

        if (projectsData.projects) {
          const transformedProjects = projectsData.projects.map(
            (project, index) => ({
              id: index + 1,
              projectId: project._id,
              projectName: project.projectName,
              projectColor: project.color,
              stockOnHand: project.totalItems || 0,
              adjustStock: 0,
              name: "",
              stocks: project.totalItems?.toString() || "0",
              stockValue: "0",
              racks: [],
              reasonForAdjustment: "",
            })
          );
          setProjectsInfo(transformedProjects);

          const rackOptionsMap = {};
          await Promise.all(
            projectsData.projects.map(async (project) => {
              try {
                if (project.rackDetails && project.rackDetails.length > 0) {
                  rackOptionsMap[project._id] = project.rackDetails.map(
                    (rack) => ({
                      value: rack.rackNumber || rack._id,
                      label: rack.rackNumber || `Rack ${rack._id}`,
                    })
                  );
                } else {
                  const racksResponse = await fetch(
                    `/api/Racks?projectId=${project._id}`
                  );
                  const racksData = await racksResponse.json();

                  if (racksData.racks && racksData.racks.length > 0) {
                    rackOptionsMap[project._id] = racksData.racks.map(
                      (rack) => ({
                        value: rack.rackNumber || rack._id,
                        label: rack.rackNumber || `Rack ${rack._id}`,
                      })
                    );
                  } else {
                    rackOptionsMap[project._id] = [];
                  }
                }
              } catch (error) {
                console.error(
                  `Error fetching racks for project ${project._id}:`,
                  error
                );
                rackOptionsMap[project._id] = [];
              }
            })
          );
          setProjectRackOptions(rackOptionsMap);

          setIncludedProjectsOptions(projectsData.projects.map(p => ({ value: p._id, label: p.projectName, color: p.color })));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load projects and racks data");
        setIncludedProjectsOptions([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchData();
  }, []);

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
    }
  };

  const handleBarcodeScanned = (scannedText) => {
    setSearchValue(scannedText);
  };
  const handleProductCodeScanned = (scannedText) => {
    setProductCode(scannedText);
  };

  const handleProjectsInfoChange = (updatedProjectsInfo) => {
    setProjectsInfo(updatedProjectsInfo);
  };
  const role = session?.user?.role?.toLowerCase?.();
  const canCreate = role === "admin" || role === "keeper";

  const handleSave = async () => {
    if (!canCreate) {
      toast.error("You don't have permission to create products");
      return;
    }
    setIsLoading(true);

    if (productPrice && (isNaN(parseFloat(productPrice)) || parseFloat(productPrice) <= 0)) {
      toast.error("Please enter a valid price");
      setIsLoading(false);
      return;
    }

    if (productWeight && (isNaN(parseFloat(productWeight)) || parseFloat(productWeight) <= 0)) {
      toast.error("Please enter a valid weight");
      setIsLoading(false);
      return;
    }

    if (overwriteThreshold && (isNaN(parseInt(overwriteThreshold)) || parseInt(overwriteThreshold) < 0)) {
      toast.error("Please enter a valid threshold");
      setIsLoading(false);
      return;
    }

    const projectsWithAdjustments = projectsInfo.filter(
      (project) => project.adjustStock > 0
    );
    for (const project of projectsWithAdjustments) {
      if (
        !project.reasonForAdjustment ||
        project.reasonForAdjustment.trim() === ""
      ) {
        toast.error(
          `Please provide a reason for stock adjustment in project: ${project.projectName}`
        );
        setIsLoading(false);
        return;
      }
    }

    if (!session?.user?.id) {
      toast.error("You must be logged in to create products");
      setIsLoading(false);
      return;
    }
    let base64Image = null;
    if (selectedImage) {
      try {
        if (selectedImage instanceof File) {
          if (!selectedImage.type.startsWith('image/')) {
            toast.error("Please select a valid image file");
            setIsLoading(false);
            return;
          }
          base64Image = await convertImageToBase64(selectedImage);
        } 
        else if (selectedImage instanceof Blob) {
          if (!selectedImage.type.startsWith('image/')) {
            toast.error("Please select a valid image file");
            setIsLoading(false);
            return;
          }
          const file = new File([selectedImage], 'image', { type: selectedImage.type });
          base64Image = await convertImageToBase64(file);
        }
        else if (typeof selectedImage === 'string') {
          if (selectedImage.startsWith('data:image/')) {
            base64Image = selectedImage;
          } else {
            toast.error("Invalid image data format");
            setIsLoading(false);
            return;
          }
        }

        if (!base64Image) {
          toast.error("Please select a valid image file");
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error("Error converting image to base64:", error);
        toast.error("Failed to process image. Please try again.");
        setIsLoading(false);
        return;
      }
    }

    const formData = {
      productId: productCode,
      productName,
      price: parseFloat(productPrice),
      category: productCategory,
      code: productCode,
      dimensions: productDimensions,
      weight: parseFloat(productWeight),
      threshold: parseInt(overwriteThreshold),
      serialNo: serialNo || null,
      unit: unit || null,
      productImage: base64Image, // Send base64 string instead of file path
      createdBy: session.user.id,
      projectsInfo: projectsInfo,
      includedProjects: includedProjects,
    };

    try {

      const response = await fetch("/api/Products", {
        method: "POST",
        headers:
        {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (response.ok && result.success) {

        let successMessage = "Product created successfully!";
        if (result.projectAssignments && result.projectAssignments.length > 0) {
          const assignmentDetails = result.projectAssignments
            .map(
              (assignment) =>
                `${assignment.projectName}: ${assignment.stockAssigned} units${assignment.racksAssigned.length > 0
                  ? ` in racks [${assignment.racksAssigned.join(", ")}]`
                  : ""
                }`
            )
            .join(", ");
          successMessage += ` Assigned to: ${assignmentDetails}`;
        }

        toast.success(successMessage);
        setProductCode("");
        setProductName("");
        setProductPrice("");
        setProductWeight("");
        setProductDimensions("");
        setProductCategory("");
        setOverwriteThreshold("");
        setSerialNo("");
        setUnit("");
        setSelectedImage(null);
        setIncludedProjects([]);

        const resetProjectsInfo = projectsInfo.map((project) => ({
          ...project,
          adjustStock: 0,
          racks: [],
          reasonForAdjustment: "",
        }));
        setProjectsInfo(resetProjectsInfo);
      } else {
        toast.error(result.error || "Failed to create product");
      }
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleCancel = () => {
    if (canCreate) {
      setShowResetDialog(true);
    } else {
      router.push("/products");
    }
  };
  const handleResetForm = () => {
    setProductCode("");
    setProductName("");
    setProductPrice("");
    setProductWeight("");
    setProductDimensions("");
    setProductCategory("");
    setOverwriteThreshold("");
    setSerialNo("");
    setUnit("");
    setSelectedImage(null);
    setIncludedProjects([]);
    setShowResetDialog(false);

    const resetProjectsInfo = projectsInfo.map((project) => ({
      ...project,
      adjustStock: 0,
      racks: [],
      reasonForAdjustment: "",
    }));
    setProjectsInfo(resetProjectsInfo);

    toast.success("Form has been reset");
  };
  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between w-full">
        <div className="layout-header">
          <h1> Add New Product</h1>
          <Breadcrumb />
        </div>
        <div className="flex items-center gap-2">
          <SearchBarcode
            value={searchValue}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onScan={handleBarcodeScanned}
            placeholder="SEARCH SKU/BARCODE"
            className=""
          />
          <Button variant="secondary" size="secondary" asChild>
            <Link href="/inventory/add-new-product">
              <FilePlus2 />
              Add New Product
            </Link>
          </Button>
        </div>
      </div>
      <div className="flex flex-row items-stretch justify-start w-full gap-10">
        <div
          className="flex flex-col w-2/3 gap-10 p-8 rounded-lg"
          style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}
        >
          <GeneralInformation
            productName={productName}
            setProductName={setProductName}
            productCode={productCode}
            setProductCode={setProductCode}
            productPrice={productPrice}
            setProductPrice={setProductPrice}
            productWeight={productWeight}
            setProductWeight={setProductWeight}
            productDimensions={productDimensions}
            setProductDimensions={setProductDimensions}
            productCategory={productCategory}
            setProductCategory={setProductCategory}
            includedProjects={includedProjects}
            setIncludedProjects={setIncludedProjects}
            includedProjectsOptions={includedProjectsOptions}
            overwriteThreshold={overwriteThreshold}
            setOverwriteThreshold={setOverwriteThreshold}
            serialNo={serialNo}
            setSerialNo={setSerialNo}
            unit={unit}
            setUnit={setUnit}
            handleProductCodeScanned={handleProductCodeScanned}
            isEditing={canCreate}
            categoryOptions={categoryOptions}
            setCategoryOptions={setCategoryOptions}
            unitOptions={unitOptions}
            setUnitOptions={setUnitOptions}
          />
        </div>
        <div
          className="flex flex-col w-1/3 gap-10 p-8 rounded-lg"
          style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}
        >
          <ProductImage
            selectedImage={selectedImage}
            setSelectedImage={canCreate ? setSelectedImage : () => {}}
            disabled={!canCreate}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {(status === "authenticated" && canCreate) && (
          <Button
            variant="default"
            size="secondary"
            className="w-[150px]"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              </>
            ) : (
              "Save Details"
            )}
          </Button>
        )}
        <Button
          variant="outline"
          size="secondary"
          className="w-[150px]"
          onClick={handleCancel}
        >
          {canCreate ? "Cancel" : "Back"}
        </Button>
      </div>
      <DeleteDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        title="Reset Form"
        description="Are you sure you want to reset the form? All entered data will be lost and cannot be recovered."
        confirmButtonText="Reset Form"
        cancelButtonText="Cancel"
        onConfirm={handleResetForm}
        onCancel={() => setShowResetDialog(false)}
        showTag={false}
      />
    </div>
  );
};

export default AddNewProductLayout;
