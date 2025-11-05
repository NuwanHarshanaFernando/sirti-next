import React from "react";
import { House } from "lucide-react";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const PrimaryBreadcrumb = ({ orderId, transactionType }) => {
    return (
        <div className="flex flex-col gap-2">
            <Breadcrumb>
                <BreadcrumbList className="text-greyOfDarkness">
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/dashboard">
                            <House className="w-4" />
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/transfers">Transfers</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <p className="!text-sm text-muted-foreground">
                            {transactionType || 'Order'} Details
                        </p>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    );
};

export default PrimaryBreadcrumb;
