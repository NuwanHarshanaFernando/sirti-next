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

const EditProductLayout = () => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams.get('id');

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
  const [excludedProjects, setExcludedProjects] = useState("");
  const [overwriteThreshold, setOverwriteThreshold] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [unit, setUnit] = useState("");
  const [projectsInfo, setProjectsInfo] = useState([]);
  const [projectRackOptions, setProjectRackOptions] = useState({});

  useEffect(() => {
    if (productId) {
      fetchProductData(productId);
      fetchProjectRackOptions();
    } else {
      setError("No product ID provided");
      setLoading(false);
    }
  }, [productId]);

  const fetchProductData = async (id) => {
    try {
      setLoading(true);

      const productResponse = await fetch(`/api/Products/${id}`);
      if (!productResponse.ok) {
        throw new Error('Failed to fetch product data');
      }

      const productData = await productResponse.json();

      setProductCode(productData.productId || "");
      setProductName(productData.productName || "");
      setProductPrice(productData.price || "");
      setProductWeight(productData.weight || "");
      setProductDimensions(productData.dimensions || "");
      setProductCategory(productData.category || "");
      setSelectedImage(productData.image || null);
      setOverwriteThreshold(productData.threshold || "");

      await fetchProductProjects(id);

    } catch (error) {
      console.error('Error fetching product data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductProjects = async (id) => {
    try {
      const projectsResponse = await fetch('/api/Projects');
      if (!projectsResponse.ok) {
        throw new Error('Failed to fetch projects');
      }

      const projectsData = await projectsResponse.json();
      const projectsWithProduct = projectsData.projects?.filter(project =>
        project.products?.some(product => product.productObjId === id)
      ) || [];
      const formattedProjects = projectsWithProduct.map(project => {
        const productInProject = project.products.find(product => product.productObjId === id);
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
      console.error('Error fetching product projects:', error);
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
              const racksResponse = await fetch(`/api/Racks?projectId=${project._id}`);
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
            console.error(`Error fetching racks for project ${project._id}:`, error);
            rackOptionsMap[project._id] = [];
          }
        }) || []
      );

      setProjectRackOptions(rackOptionsMap);
    } catch (error) {
      console.error("Error fetching project rack options:", error);
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
      };

      const productResponse = await fetch(`/api/Products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productUpdateData),
      });

      if (!productResponse.ok) {
        throw new Error('Failed to update product');
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

          const stockResponse = await fetch('/api/Products/updateStock', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(stockUpdateData),
          });

          if (!stockResponse.ok) {
            console.error(`Failed to update stock for project ${projectInfo.projectName}`);
          }
        }
      }

      alert('Product updated successfully!');
      router.push('/products');

    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error updating product: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/products');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-lg">Loading product data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error}</div>
        <button
          onClick={() => router.push('/products')}
          className="px-4 py-2 mt-4 text-white bg-blue-500 rounded"
        >
          Back to Products
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between w-full">
        <div className="layout-header">
          <h1>Edit "{productName || 'Product'}"</h1>
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
            <Link href="/products/add-new-product">
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
            excludedProjects={excludedProjects}
            setExcludedProjects={setExcludedProjects}
            overwriteThreshold={overwriteThreshold}
            setOverwriteThreshold={setOverwriteThreshold}
            handleProductCodeScanned={handleProductCodeScanned}
          />
        </div>
        <div
          className="flex flex-col w-1/3 gap-10 p-8 rounded-lg"
          style={{ boxShadow: "0px 0px 10px 0px #0000000A" }}
        >
          <ProductImage
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
          />
        </div>
      </div>
      <ProjectsInfoTable
        projectsInfo={projectsInfo}
        onProjectsInfoChange={handleProjectsInfoChange}
        projectRackOptions={projectRackOptions}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="secondary"
          className="w-[150px]"
          onClick={handleSave}
        >
          Save Details
        </Button>
        <Button
          variant="outline"
          size="secondary"
          className="w-[150px]"
          onClick={handleCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default EditProductLayout;
