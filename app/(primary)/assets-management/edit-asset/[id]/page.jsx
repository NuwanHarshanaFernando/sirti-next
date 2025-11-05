import React from "react";
import EditAssetLayout from "@/components/layouts/edit-asset-layout";

// Next.js 13+ route: get id from params
const Page = async ({ params }) => {
  const { id } = await params;
  return (
    <div className="flex flex-col w-full">
      <EditAssetLayout id={id} />
    </div>
  );
};

export default Page;