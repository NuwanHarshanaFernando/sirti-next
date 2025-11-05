"use client";
import React from "react";
import { House } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const PrimaryBreadcrumb = () => {
  return (
    <Breadcrumb>
      <BreadcrumbList className="text-greyOfDarkness">
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">
            <House className="w-4" />
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/inventory">Inventory</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/inventory/edit-product">Edit Product</BreadcrumbLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default PrimaryBreadcrumb;
