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
                    <BreadcrumbLink href="/assets-management">Assets Management</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbLink href="/assets-management/add-new-asset">Add New Asset</BreadcrumbLink>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
    );
};

export default PrimaryBreadcrumb;