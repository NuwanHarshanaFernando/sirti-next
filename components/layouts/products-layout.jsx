"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Breadcrumb from "@/components/primary/products/PrimaryBreadcrumb";
import ProductsTable from "../primary/products/ProductsTable";
import { Button } from "../ui/button";
import { FilePlus2, SlidersHorizontal } from "lucide-react";
import { Combobox } from "../ui/combobox";
import SearchBarcode from "../shared/search-barcode-input";
import { Skeleton } from "../ui/skeleton";
import Link from "next/link";

const ProductsLayout = () => {
  const [selectedFilter, setSelectedFilter] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const searchInputRef = useRef(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 500);

    return () => clearTimeout(timer);
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

  const filterOptions = [
    { value: "all", label: "All Products" },
    { value: "in_stock", label: "In Stock" },
    { value: "out_of_stock", label: "Out of Stock" },
    { value: "low_stock", label: "Low Stock" },
  ];

  useEffect(() => {
    let barcode = "";
    let isTyping = false;
    let typingTimer;

    const handleGlobalKeyPress = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      if (/^[a-zA-Z0-9]$/.test(e.key)) {
        if (!isTyping) {
          barcode = "";
          isTyping = true;
        }

        barcode += e.key;

        clearTimeout(typingTimer);

        typingTimer = setTimeout(() => {
          if (barcode.length >= 4) {
            setSearchValue(barcode);
            if (searchInputRef.current) {
              const input = searchInputRef.current.querySelector("input");
              if (input) {
                input.focus();
              }
            }
          }
          barcode = "";
          isTyping = false;
        }, 100);
      }
    };

    document.addEventListener("keypress", handleGlobalKeyPress);

    return () => {
      document.removeEventListener("keypress", handleGlobalKeyPress);
      clearTimeout(typingTimer);
    };
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

  return (
    <div className="flex flex-col gap-10">
      {isInitialLoading ? (
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col gap-2 layout-header">
            <Skeleton className="w-32 h-8 mb-2" />
            <Skeleton className="w-48 h-5" />
          </div>
          <div className="flex items-center gap-2 w-[520px] max-w-full">
            <Skeleton className="w-64 h-10 rounded-md" />
            <Skeleton className="w-48 h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md w-44" />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full">
          <div className="layout-header">
            <h1>Products</h1>
            <Breadcrumb />
          </div>
          <div className="flex items-center gap-2">
            <SearchBarcode
              ref={searchInputRef}
              value={searchValue}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onScan={handleBarcodeScanned}
              placeholder="SEARCH SKU/BARCODE"
              className=""
            />
            <Combobox
              options={filterOptions}
              value={selectedFilter}
              onValueChange={setSelectedFilter}
              placeholder="Filter By Category"
              className=""
              icon={SlidersHorizontal}
            />
            <Button variant="secondary" size="secondary" asChild>
              <Link href="/inventory/add-new-product">
                <FilePlus2 />
                Add New Product
              </Link>
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center justify-start w-full">
        <div className="flex flex-col w-full gap-10">
          <ProductsTable
            searchValue={searchValue}
            selectedFilter={selectedFilter}
            isParentLoading={isInitialLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductsLayout;
