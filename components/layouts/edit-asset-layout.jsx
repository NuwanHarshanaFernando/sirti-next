
"use client";
import React, { useEffect, useState } from "react";
import SearchBarcode from "@/components/shared/search-barcode-input";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import GeneralInformation from "@/components/primary/assets-management/GeneralInformation";
import PrimaryBreadcrumb from "../primary/assets-management/edit-asset/PrimaryBreadcrumb";

const EditAssetLayout = ({ id }) => {
  const [searchValue, setSearchValue] = useState("");  
  const { data: session } = useSession();
  const [productName, setProductName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [serviceTerm, setServiceTerm] = useState("");
  const [productDimensions, setProductDimensions] = useState("");
  const [productWeight, setProductWeight] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [assetManager, setAssetManager] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [assetManagers, setAssetManagers] = useState([]);
  const [productCategory, setProductCategory] = useState("");
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [manufacturerOptions, setManufacturerOptions] = useState([]);
  const [attachmentPath, setAttachmentPath] = useState("");
  const [certificate, setCertificate] = useState(null);
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("Operational");

  // Fetch asset data for editing
  const [loading, setLoading] = useState(true);
  const fetchAssetData = async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/assets?id=${id}`);
      if (!response.ok) throw new Error("Failed to fetch asset data");
      const asset = await response.json();
      setProductName(asset.asset.productName || "");
      setProductCode(asset.asset.productCode || "");
      setProductPrice(asset.asset.productPrice || "");
      setServiceTerm(asset.asset.serviceTerm || "");
      setProductDimensions(asset.asset.productDimensions || "");
      setProductWeight(asset.asset.productWeight || "");
      setNextServiceDate(asset.asset.nextServiceDate || "");
      // Find the asset manager's _id from the fetched asset managers list
      let managerId = "";
      if (asset.asset.assetsManager) {
        managerId = asset.asset.assetsManager;
      } else if (asset.asset.assetsManagerId) {
        managerId = asset.asset.assetsManagerId;
      } else if (asset.asset.assetsManagerName && Array.isArray(assetManagers)) {
        // Try to find by name if only name is present
        const found = assetManagers.find(m => m.name === asset.asset.assetsManagerName);
        if (found) managerId = found._id;
      }
      setAssetManager(managerId || "");
      setSerialNo(asset.asset.serialNumber || asset.asset.serialNo || "");
      setManufacturer(asset.asset.manufacturer || "");
      setPurchaseDate(asset.asset.purchaseDate || "");
      setSelectedImage(asset.asset.selectedImage || asset.asset.productImage || "");
      setProductCategory(asset.asset.productCategory || asset.asset.category || "");
      setAttachmentPath(asset.asset.attachmentPath || "");
      setCertificate(asset.asset.certificate || null);
      setProjectId(asset.asset.projectId || "");
      setStatus(asset.asset.status || "Operational");
    } catch (error) {
      console.error("Error fetching asset data:", error);
    } finally {
      setLoading(false);
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

  const fetchAssetManagers = async () => {
    try {
      const response = await fetch("/api/Users");
      if (!response.ok) {
        throw new Error("Failed to fetch asset managers");
      }
      const data = await response.json();
      const eligibleUsers = (data.users || []).filter(
        (user) => user.role === "admin" || user.role === "manager"
      );
      setAssetManagers(eligibleUsers);
    } catch (error) {
      console.error("Error fetching asset managers:", error);
    }
  };

  const fetchCategoryOptions = async () => {
    try {
      const response = await fetch("/api/assets");
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      const data = await response.json();
      const categories = data.map(asset => ({
        value: asset.category,
        label: asset.category || "Uncategorized",
      }));
      const uniqueCategories = Array.from(new Set(categories.map(cat => cat.value)));
      setCategoryOptions(uniqueCategories.map(cat => ({
        value: cat,
        label: cat || "Uncategorized",
      })));
    } catch (error) {
      console.error("Error fetching category options:", error);
    }
  };

  const fetchManufacturerOptions = async () => {
    try {
      const response = await fetch("/api/assets");
      if (!response.ok) {
        throw new Error("Failed to fetch manufacturers");
      }
      const data = await response.json();
      const manufacturers = data.map(asset => ({
        value: asset.manufacture,
        label: asset.manufacture || "Unknown",
      }));
      const uniqueManufacturers = Array.from(new Set(manufacturers.map(m => m.value)));
      setManufacturerOptions(uniqueManufacturers.map(m => ({
        value: m,
        label: m || "Unknown",
      })));
    } catch (error) {
      console.error("Error fetching manufacturer options:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/Projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };


  useEffect(() => {
    // Fetch managers, categories, and manufacturers first, then asset data
    const fetchAll = async () => {
      await Promise.all([
        fetchAssetManagers(),
        fetchCategoryOptions(),
        fetchManufacturerOptions(),
        fetchProjects()
      ]);
      await fetchAssetData();
    };
    fetchAll();
    // eslint-disable-next-line
  }, [id]);


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <span>Loading asset data...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between w-full">
        <div className="layout-header">
          <h1>Edit Asset</h1>
          <PrimaryBreadcrumb />
        </div>
        <div className="flex items-center gap-2">
          <SearchBarcode
            value={searchValue}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onScan={handleBarcodeScanned}
            placeholder="SEARCH"
          />
          <Button variant="secondary" size="secondary" asChild>
            <Link href="/assets-management/add-new-asset">
              <FilePlus2 />
              Add New ASSETS
            </Link>
          </Button>
        </div>
      </div>
      <div className="flex flex-row items-start justify-start w-full gap-10">
        <div className="flex flex-col w-full gap-10">
           <GeneralInformation
            productName={productName}
            setProductName={setProductName}
            productCode={productCode}
            setProductCode={setProductCode}
            productPrice={productPrice}
            setProductPrice={setProductPrice}
            serviceTerm={serviceTerm}
            setServiceTerm={setServiceTerm}
            productDimensions={productDimensions}
            setProductDimensions={setProductDimensions}
            productWeight={productWeight}
            setProductWeight={setProductWeight}
            nextServiceDate={nextServiceDate}
            setNextServiceDate={setNextServiceDate}
            assetManager={assetManager}
            setAssetManager={setAssetManager}
            serialNo={serialNo}
            setSerialNo={setSerialNo}
            manufacturer={manufacturer}
            setManufacturer={setManufacturer}
            manufacturerOptions={manufacturerOptions}
            setManufacturerOptions={setManufacturerOptions}
            purchaseDate={purchaseDate}
            setPurchaseDate={setPurchaseDate}
            handleProductCodeScanned={handleProductCodeScanned}
            isEditing={true}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
            assetManagerOptions={assetManagers.map(manager => ({
              value: manager._id,
              label: manager.name,
            }))}
            productCategory={productCategory}
            setProductCategory={setProductCategory}
            categoryOptions={categoryOptions}
            setCategoryOptions={setCategoryOptions}
            attachmentPath={attachmentPath}
            setAttachmentPath={setAttachmentPath}
             certificate={certificate}
            projectId={projectId}
            setProjectId={setProjectId}
            projectOptions={projects}
            status={status}
             setStatus={setStatus}
             readOnly={session?.user?.role === 'manager'}
          />
        </div>
      </div>
    </div>
  );
};

export default EditAssetLayout;
