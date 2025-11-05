"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Breadcrumb from "@/components/primary/inventory/PrimaryBreadcrumb";
import MergedInventoryTable from "../primary/inventory/MergedInventoryTable";
import { Button } from "../ui/button";
import {
  FileInput,
  FileOutput,
  FilePlus2,
  SlidersHorizontal,
  FolderPlus,
} from "lucide-react";
import { Combobox } from "../ui/combobox";
import { MultiCombobox } from "../ui/multi-combobox";
import SearchBarcode from "../shared/search-barcode-input";
import BarcodeScanIndicator from "../shared/barcode-scan-indicator";
import useGlobalBarcodeScanner from "@/hooks/use-global-barcode-scanner";
import Link from "next/link";
import { Skeleton } from "../ui/skeleton";
import { toast } from "sonner";

const MergedInventoryLayout = ({ session }) => {
  const [selectedFilter, setSelectedFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProjectName, setSelectedProjectName] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [categories, setCategories] = useState([]);
  const [projectNames, setProjectNames] = useState([]);
  const [lastScannedCode, setLastScannedCode] = useState("");
  const [showScanFeedback, setShowScanFeedback] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const searchInputRef = useRef(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/Products/categories");
        if (response.ok) {
          const data = await response.json();
          setCategories([...data.categories]);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProjectNames = async () => {
      try {
        const response = await fetch("/api/Projects");
        if (response.ok) {
          const data = await response.json();
          // Exclude Lobby/LB projects from the top filter options
          const filteredProjects = Array.isArray(data.projects)
            ? data.projects.filter(
                (p) =>
                  !p?.isLobby &&
                  !(/lobby/i.test(p?.projectName || "") || /\(\s*lb\s*\)/i.test(p?.projectName || "") || /^\s*lb\s*$/i.test(p?.projectName || ""))
              )
            : [];

          const uniqueProjectNames = [
            ...new Set(
              filteredProjects
                .map((project) => project.projectName)
                .filter((name) => name && name.trim() !== "")
            ),
          ].sort();

          setProjectNames([
            { value: "", label: "All Projects" },
            ...uniqueProjectNames.map((name) => ({
              value: name,
              label: name,
            })),
          ]);
        }
      } catch (error) {
        console.error("Error fetching project names:", error);
      }
    };

    fetchProjectNames();
  }, []);

  useEffect(() => {
    const filter = searchParams.get("filter");
    const lowStockFlag = searchParams.get("lowStock");
    if (filter === "low_stock" || lowStockFlag === "1") {
      setSelectedFilter("low_stock");
      if (lowStockFlag === "1") {
        const url = new URL(window.location.href);
        url.searchParams.delete("lowStock");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    }
  }, [searchParams]);

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
        <div className="flex flex-col gap-10">
          <div className="flex flex-col items-start gap-6 md:flex-row md:justify-between md:items-center">
            <Skeleton className="w-1/3 h-8" />
            <div className="flex flex-col w-full gap-4 sm:flex-row sm:w-auto">
              <Skeleton className="w-full h-10 sm:w-44" />
              <Skeleton className="w-full h-10 sm:w-44" />
              <Skeleton className="w-full h-10 sm:w-44" />
              <Skeleton className="w-full h-10 sm:w-44" />
            </div>
          </div>
          <div className="flex flex-col w-full gap-10">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="w-2/3 h-10" />
              <Skeleton className="w-1/3 h-10" />
            </div>
            <div className="flex flex-col w-full gap-5">
              {[...Array(4)].map((_, idx) => (
                <Skeleton
                  key={idx}
                  className="w-full h-8 mb-2"
                  shimmer={false}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col w-full gap-10 pb-10">
            <div className="flex items-center justify-between w-full">
              <div className="layout-header">
                <h1>Inventory</h1>
                <Breadcrumb />
              </div>

              <div className="flex items-center gap-2">
                <SearchBarcode
                  placeholder="SEARCH BY SKU/CODE/NAME"
                  className=""
                  value={searchValue}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onScan={handleBarcodeScanned}
                  ref={searchInputRef}
                />{" "}
                <Combobox
                  options={projectNames}
                  value={selectedProjectName}
                  onValueChange={setSelectedProjectName}
                  placeholder="Filter by Project Name"
                  icon={SlidersHorizontal}
                  className="w-[200px]"
                />
                <MultiCombobox
                  options={categories}
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                  placeholder="Filter by Category"
                  icon={SlidersHorizontal}
                  className="w-[200px]"
                />
                {session?.user?.role &&
                  (session.user.role === "admin" ||
                    session.user.role === "keeper") && (
                    <Link href="/inventory/stock-manage?type=in">
                      <Button variant="secondary" size="secondary">
                        <FileInput className="w-4 h-4" />
                        QTY In
                      </Button>
                    </Link>
                  )}
                {session?.user?.role &&
                  (session.user.role === "admin" ||
                    session.user.role === "keeper") && (
                    <Link href="/inventory/stock-manage?type=out">
                      <Button variant="secondary" size="secondary">
                        <FileOutput className="w-4 h-4" />
                        QTY Out
                      </Button>
                    </Link>
                  )}
                {session?.user?.role &&
                  (session.user.role === "admin" ||
                    session.user.role === "keeper") && (
                    <Link href="/inventory/add-new-product">
                      <Button variant="secondary" size="secondary">
                        <FilePlus2 className="w-4 h-4" />
                        Add New Product
                      </Button>
                    </Link>
                  )}
                {session?.user?.role &&
                  (session.user.role === "admin" ||
                    session.user.role === "manager") && (
                    <Link href="/inventory/order-create?type=out">
                      <Button variant="secondary" size="secondary">
                        <FolderPlus className="w-4 h-4" />
                        Create Order
                      </Button>
                    </Link>
                  )}
              </div>
            </div>{" "}
            <MergedInventoryTable
              searchValue={searchValue}
              selectedFilter={selectedFilter}
              selectedCategory={selectedCategory}
              selectedProjectName={selectedProjectName}
              session={session}
              isParentLoading={isInitialLoading}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default MergedInventoryLayout;
