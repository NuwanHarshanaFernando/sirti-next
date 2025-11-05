"use client";
import React, { useEffect, useState } from "react";
import Breadcrumb from "@/components/primary/assets-management/manage-asset/PrimaryBreadcrumb";
import SearchBarcode from "@/components/shared/search-barcode-input";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import GeneralInformation from "@/components/primary/assets-management/GeneralInformation";
import AssetManagementHistory from "@/components/primary/assets-management/manage-asset/AssetManagementHistory";
import ServiceHistory from "@/components/primary/assets-management/manage-asset/ServiceHistory";
import { ca } from "date-fns/locale";
import PrimaryBreadcrumb from "../primary/assets-management/add-new-asset/PrimaryBreadcrumb";

const AddNewAssetLayout = () => {
  const [searchValue, setSearchValue] = useState("");  
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
  const [status, setStatus] = useState("Operational");

  
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
      // Include both admins and managers as eligible asset managers
      const eligibleUsers = (data.users || []).filter(
        (user) => user.role === "admin" || user.role === "manager"
      );
      setAssetManagers(eligibleUsers);
    }catch (error) {
      console.error("Error fetching asset managers:", error);
    }
  }
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
  useEffect(() => {
    fetchAssetManagers();
    fetchCategoryOptions();
    fetchManufacturerOptions();
  }, []);



  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between w-full">
        <div className="layout-header">
          <h1>Assets Management</h1>
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
            isEditing={false}
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
            status={status}
            setStatus={setStatus}
          />
        </div>
      </div>
    </div>
  );
};

export default AddNewAssetLayout