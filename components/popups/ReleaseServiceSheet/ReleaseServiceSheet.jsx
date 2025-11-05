import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet";
import {
    FolderDotIcon,
    FolderPen,
    Phone,
    User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ApprovalSheetLable from "@/components/popups/ApprovalSheet/ApprovalSheetLable";
import ApproveTracker from "@/components/popups/ApprovalSheet/ApproveTracker";

const ReleaseServiceSheet = ({
    triggerText = "Open",
    pendingServiceCount = 10,
    serviceName = "Asset Maintenance Term Scheduled by the System",
    serviceStatus = "Under Maintenance",
    statusColor = "#F9AD01",
    merchantDetails = {
        name: "Huawei Corp (Private) Ltd",
        phoneNumber: "+97 (255) 445 6698",
    },
    serviceTrackingItems = []
}) => {
    const defaultServiceTrackingItems = [
        {
            status: "Pending Approval",
            dueDate: "Due Not Applicable",
            icon: User,
            iconColor: "#E27100"
        },
        {
            status: "Rishzard @ Project B created request",
            dueDate: "02/06/2025 at 09:41:07",
            icon: User,
            iconColor: "#895BBA"
        },
    ];
    const finalServiceTrackingItems = serviceTrackingItems.length > 0 ? serviceTrackingItems : defaultServiceTrackingItems;
    return (
        <>
            <Sheet>
                <SheetTrigger className="font-normal cursor-pointer !text-[15px] text-lemonChrome bg-lemonChrome/20 w-fit py-0.5 px-2 rounded-md ml-auto">{pendingServiceCount} {triggerText}</SheetTrigger>
                <SheetContent className="gap-0 bg-white border-none">
                    <SheetHeader>
                        <SheetTitle>
                            <div className="flex flex-row items-center gap-2 pb-4 mt-5 border-b border-black/10">
                                <div className="flex flex-col items-center justify-center !w-10 h-10 aspect-square rounded-full bg-[#895BBA]/10">
                                    <FolderDotIcon className="w-5 h-5 stroke-[#895BBA]" />
                                </div>
                                <div className="flex flex-row">
                                    <p className="font-normal">
                                        <span className="!text-base font-medium ml-1">
                                            {serviceName}
                                        </span>
                                        <span
                                            className="!text-xs font-medium rounded-sm px-2 py-1 ml-2"
                                            style={{
                                                backgroundColor: `${statusColor}10`,
                                                color: statusColor
                                            }}
                                        >
                                            {serviceStatus}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </SheetTitle>
                    </SheetHeader>
                    <div>
                        <div className="flex flex-col gap-2 pb-4 mx-4 border-b border-black/10">
                            <ApprovalSheetLable
                                label="Merchant Name:"
                                value={merchantDetails.name}
                                icon={FolderPen}
                                iconColor="#E76500"
                            />
                            <ApprovalSheetLable
                                label="Phone Number:"
                                value={merchantDetails.phoneNumber}
                                icon={Phone}
                                iconColor="#4283DE"
                            />
                        </div>
                        <div className="flex flex-col gap-2 py-4 mx-4">
                            <ApproveTracker trackingItems={finalServiceTrackingItems} />
                        </div>
                    </div>
                    <SheetFooter className="p-0">
                        <div className="flex flex-row w-full gap-0 p-0">
                            <Button className="w-1/2 rounded-none" type="submit">
                                Release Service
                            </Button>
                            <Button
                                variant="default"
                                className="w-1/2 rounded-none text-amalfitanAzure bg-amalfitanAzure/10"
                                type="submit"
                            >
                                Ignore Service
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </>
    );
};

export default ReleaseServiceSheet;