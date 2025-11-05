import React, { Suspense } from "react";
import EditProductLayout from "@/components/layouts/edit-product-layout";

const page = () => {
  return (
    <div className="flex flex-col w-full">
      <Suspense fallback={<div>Loading...</div>}>
        <EditProductLayout />
      </Suspense>
    </div>
  );
};

export default page;
