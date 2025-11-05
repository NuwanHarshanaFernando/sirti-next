import React from "react";
import { House } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const PrimaryBreadcrumb = ({ type = "in", isOrderMode = false }) => {
  const getTitle = () => {
    if (isOrderMode) {
      return "Create Order";
    }
    return type === "in" ? "Create GRN Order" : "Create Delivery Notice";
  };

  const getHref = () => {
    if (isOrderMode) {
      return `/inventory/order-create?type=${type}`;
    }
    return `/inventory/stock-manage?type=${type}`;
  };

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
          <BreadcrumbLink href={getHref()}>
            {getTitle()}
          </BreadcrumbLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default PrimaryBreadcrumb;
