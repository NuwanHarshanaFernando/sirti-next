import React from "react";
import { House } from "lucide-react";
import { usePathname } from "next/navigation";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const PrimaryBreadcrumb = () => {
    const pathname = usePathname();
    const assetId = pathname.split('/').pop();

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
                    <BreadcrumbLink href={`/assets-management/edit-asset/${assetId}`}>Edit Asset</BreadcrumbLink>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
    );
};

export default PrimaryBreadcrumb;