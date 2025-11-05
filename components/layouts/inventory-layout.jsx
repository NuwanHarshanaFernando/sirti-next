"use client";
import React, { useState } from "react";
import Breadcrumb from "@/components/primary/inventory/PrimaryBreadcrumb";
import InventoryTable from "../primary/inventory/InventoryTable";
import SearchBarcode from "../shared/search-barcode-input";
import BarcodeScanIndicator from "../shared/barcode-scan-indicator";
import useGlobalBarcodeScanner from "@/hooks/use-global-barcode-scanner";
import { Skeleton } from "../ui/skeleton";

const InventoryLayout = ({ session }) => {
  const [selectedFilter, setSelectedFilter] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [lastScannedCode, setLastScannedCode] = useState("");
  const [showScanFeedback, setShowScanFeedback] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const { isScanning, currentBuffer } = useGlobalBarcodeScanner(
    (scannedCode) => {
      setSearchValue(scannedCode);
      setLastScannedCode(scannedCode);
      setShowScanFeedback(true);
      setTimeout(() => setShowScanFeedback(false), 3000);
    },
    {
      minLength: 4,
      maxLength: 50,
      timeout: 100,
      preventDefaultOnScan: true,
      enabled: true,
    }
  );

  const filterOptions = [
    { value: "all", label: "All Inventory" },
    { value: "in_stock", label: "In Stock" },
    { value: "out_of_stock", label: "Out of Stock" },
  ];
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
  return (
    <div className="flex flex-col gap-10">
      <BarcodeScanIndicator
        isScanning={isScanning}
        currentBuffer={currentBuffer}
      />

      {showScanFeedback && (
        <div className="fixed z-50 transform -translate-x-1/2 top-4 left-1/2">
          <div className="flex items-center gap-2 px-4 py-2 text-white bg-green-500 rounded-lg shadow-lg">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
            <span className="font-medium">
              Barcode scanned: {lastScannedCode}
            </span>
          </div>
        </div>
      )}

      {isInitialLoading ? (
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col gap-2 layout-header">
            <Skeleton className="w-32 h-8 mb-2" />
            <Skeleton className="w-48 h-5" />
          </div>
          <div className="flex items-center gap-2 w-[320px] max-w-full">
            <Skeleton className="w-64 h-10 rounded-md" />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full">
          <div className="layout-header">
            <h1>Inventory</h1>
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
          </div>
        </div>
      )}
      <div className="flex flex-col items-center justify-start w-full">
        <div className="flex flex-col w-full gap-10">
          <InventoryTable
            searchValue={searchValue}
            selectedFilter={selectedFilter}
            session={session}
          />
          
        </div>
      </div>
    </div>
  );
};

export default InventoryLayout;
