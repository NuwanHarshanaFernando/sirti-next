"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Breadcrumb from "@/components/primary/products/edit-product/PrimaryBreadcrumb";
import GeneralInformation from "@/components/primary/products/edit-product/GeneralInformation";
import ProductImage from "@/components/primary/products/edit-product/ProductImage";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import SearchBarcode from "@/components/shared/search-barcode-input";
import ProjectsInfoTable from "@/components/primary/products/edit-product/ProjectsInfoTable";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import RoleGate from "@/components/auth/role-gate";

const EditProductLayout = () => {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const [projectsInfo, setProjectsInfo] = useState([]);
  const [projectRackOptions, setProjectRackOptions] = useState({});
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);

  useEffect(() => {
    if (productId) {
      fetchProductData(productId);
      fetchProjectRackOptions();
      fetchAllProjects();
      fetchCategories();
      fetchUnits();
    } else {
      setError("No product ID provided");
      setLoading(false);
    }
  }, [productId]);

  const fetchCategories = async () => {
    try {
      const categoriesResponse = await fetch("/api/Products/categories");
      const categoriesData = await categoriesResponse.json();

      if (categoriesData.categories) {
        setCategoryOptions(categoriesData.categories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchUnits = async () => {
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
        setUnitOptions([
          { value: "pcs", label: "Pieces" },
          { value: "kg", label: "Kilograms" },
          { value: "l", label: "Liters" }
        ]);
      }
    } catch (error) {
      console.error("Error fetching units:", error);
      setUnitOptions([
        { value: "pcs", label: "Pieces" },
        { value: "kg", label: "Kilograms" },
        { value: "l", label: "Liters" }
      ]);
    }
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

  const fetchProductData = async (id) => {
    try {
      setLoading(true);

      const productResponse = await fetch(`/api/Products/${id}`);
      if (!productResponse.ok) {
        throw new Error("Failed to fetch product data");
      }

      const productData = await productResponse.json();
      setProductCode(productData.productSKU || productData.productId || "");
      setProductName(productData.productName || "");
      setProductPrice(productData.price || "");
      setProductWeight(productData.weight || "");
      setProductDimensions(productData.dimensions || "");
      setProductCategory(productData.category || "");
      setSelectedImage(productData.productImage || null); 
  setOverwriteThreshold(productData.threshold || "");
  // Prefer serialNumber from collection, fallback to legacy serialNo
  setSerialNo(productData.serialNumber || productData.serialNo || "");
      
      const productUnit = productData.unit || "";
      setUnit(productUnit);
      
      if (productUnit && unitOptions.length > 0) {
        ensureUnitInOptions(productUnit, unitOptions);
      }
      await fetchProductProjects(id);

      setIncludedProjects(
        Array.isArray(productData.includedProjects)
          ? productData.includedProjects.map((id) => id.toString())
          : []
      );
    } catch (error) {
      console.error("Error fetching product data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductProjects = async (id) => {
    try {
      const projectsResponse = await fetch("/api/Projects");
      if (!projectsResponse.ok) {
        throw new Error("Failed to fetch projects");
      }

      const projectsData = await projectsResponse.json();
      const projectsWithProduct =
        projectsData.projects?.filter((project) =>
          project.products?.some((product) => product.productObjId === id)
        ) || [];
      const formattedProjects = projectsWithProduct.map((project) => {
        const productInProject = project.products.find(
          (product) => product.productObjId === id
        );
        return {
          id: project._id,
          projectId: project._id,
          projectName: project.projectName,
          projectColor: project.color,
          stockOnHand: productInProject?.stocks || 0,
          adjustStock: 0,
          racks: [],
          reasonForAdjustment: "",
        };
      });

      setProjectsInfo(formattedProjects);
    } catch (error) {
      console.error("Error fetching product projects:", error);
    }
  };
  const fetchProjectRackOptions = async () => {
    try {
      const projectsResponse = await fetch("/api/Projects");
      if (!projectsResponse.ok) {
        throw new Error("Failed to fetch projects");
      }

      const projectsData = await projectsResponse.json();
      const rackOptionsMap = {};

      await Promise.all(
        projectsData.projects?.map(async (project) => {
          try {
            if (project.racks && project.racks.length > 0) {
              const racksResponse = await fetch(
                `/api/Racks?projectId=${project._id}`
              );
              const racksData = await racksResponse.json();

              if (racksData.racks && racksData.racks.length > 0) {
                rackOptionsMap[project._id] = racksData.racks.map((rack) => ({
                  value: rack.rackNumber || rack._id,
                  label: rack.rackNumber || `Rack ${rack._id}`,
                }));
              } else {
                rackOptionsMap[project._id] = [];
              }
            } else {
              rackOptionsMap[project._id] = [];
            }
          } catch (error) {
            console.error(
              `Error fetching racks for project ${project._id}:`,
              error
            );
            rackOptionsMap[project._id] = [];
          }
        }) || []
      );

      setProjectRackOptions(rackOptionsMap);
    } catch (error) {
      console.error("Error fetching project rack options:", error);
    }
  };

  const fetchAllProjects = async () => {
    try {
      const response = await fetch("/api/Projects");
      const data = await response.json();
      if (data.projects) {
        setIncludedProjectsOptions(
          data.projects.map((p) => ({
            value: p._id,
            label: p.projectName,
            color: p.color,
          }))
        );
      }
    } catch (e) {
      setIncludedProjectsOptions([]);
    }
  };

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

  const handleSave = async () => {
    try {
      setLoading(true);
      const productUpdateData = {
        productName,
        price: productPrice,
        weight: productWeight,
        dimensions: productDimensions,
        category: productCategory,
        image: selectedImage, 
        threshold: overwriteThreshold,
        // Persist to both fields for compatibility
        serialNo: serialNo,
        serialNumber: serialNo,
        unit: unit,
        userEmail: session?.user?.email || "unknown@example.com",
        userName: session?.user?.name || "Unknown User",
        includedProjects: includedProjects,
      };

      const productResponse = await fetch(`/api/Products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productUpdateData),
      });

      if (!productResponse.ok) {
        throw new Error("Failed to update product");
      }

      for (const projectInfo of projectsInfo) {
        if (projectInfo.adjustStock !== 0) {
          const stockUpdateData = {
            productId: productId,
            projectId: projectInfo.id,
            newStock: projectInfo.stockOnHand + projectInfo.adjustStock,
            adjustmentReason: projectInfo.reasonForAdjustment,
            racks: projectInfo.racks,
          };

          const stockResponse = await fetch("/api/Products/updateStock", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(stockUpdateData),
          });

          if (!stockResponse.ok) {
            console.error(
              `Failed to update stock for project ${projectInfo.projectName}`
            );
          }
        }
      }
      toast.success("Product updated successfully!");
      router.push("/products");
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Error updating product: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/products");
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-10">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col gap-2 layout-header">
            <Skeleton className="w-48 h-8 mb-2" />
            <Skeleton className="w-64 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-64 h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md w-44" />
          </div>
        </div>
        <div className="flex flex-row items-stretch justify-start w-full gap-10">
          <div className="flex flex-col w-2/3 gap-6 p-8 rounded-lg">
            <Skeleton className="w-1/2 h-8 mb-4" />
            <Skeleton className="w-full h-10 mb-2" />
            <Skeleton className="w-full h-10 mb-2" />
            <Skeleton className="w-full h-10 mb-2" />
            <Skeleton className="w-full h-10 mb-2" />
            <Skeleton className="w-full h-10 mb-2" />
            <Skeleton className="w-full h-10 mb-2" />
            <Skeleton className="w-full h-10 mb-2" />
          </div>
          <div className="flex flex-col w-1/3 gap-6 p-8 rounded-lg">
            <Skeleton className="w-full h-64 mb-4 rounded-lg" />
            <Skeleton className="w-1/2 h-10" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-[150px] rounded-md" />
          <Skeleton className="h-10 w-[150px] rounded-md" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error}</div>
        <button
          onClick={() => router.push("/products")}
          className="px-4 py-2 mt-4 text-white bg-blue-500 rounded"
        >
          Back to Products
        </button>
      </div>
    );
  }

  const role = session?.user?.role?.toLowerCase?.();
  const isAdmin = (status === 'authenticated' && role === 'admin');
  const canEdit = (status === 'authenticated' && (role === 'admin' || role === 'keeper'));
  const canCreate = role === 'admin' || role === 'keeper';

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between w-full">
        <div className="layout-header">
          <h1>Edit "{productName || "Product"}"</h1>
          <Breadcrumb />
        </div>
        <div className="flex items-center gap-2">
          <RoleGate roles={["admin", "keeper"]}>
            <Button variant="secondary" size="secondary" asChild>
              <Link href="/inventory/add-new-product">
                <FilePlus2 />
                Add New Product
              </Link>
            </Button>
          </RoleGate>
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
            // isEditing={isAdmin}
            isEditing={canEdit}
            handleProductCodeScanned={handleProductCodeScanned}
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
            // setSelectedImage={isAdmin ? setSelectedImage : () => {}}
            // disabled={!isAdmin}
            setSelectedImage={canEdit ? setSelectedImage : () => {}}
            disabled={!canEdit}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <RoleGate roles={["admin", "keeper"]}>
          <Button
            variant="default"
            size="secondary"
            className="w-[150px]"
            onClick={handleSave}
          >
            Save Details
          </Button>
        </RoleGate>
        <Button
          variant="outline"
          size="secondary"
          className="w-[150px]"
          onClick={handleCancel}
        >
          {/* {isAdmin ? 'Cancel' : 'Back'} */}
          {canEdit ? 'Cancel' : 'Back'}
        </Button>
      </div>
    </div>
  );
};

export default EditProductLayout;
