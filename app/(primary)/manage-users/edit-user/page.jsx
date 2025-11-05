import EditUserLayout from "@/components/layouts/edit-user-layout";
import React, { Suspense } from "react";

const page = () => {
  return (
    <div className="flex flex-col w-full">
      <Suspense fallback={<div>Loading...</div>}>
        <EditUserLayout />
      </Suspense>
    </div>
  );
};

export default page;
