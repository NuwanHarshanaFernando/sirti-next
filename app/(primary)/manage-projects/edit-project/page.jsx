import React, { Suspense } from "react";
import EditProjectLayout from "@/components/layouts/edit-project-layout";

const EditProjectPage = () => {
  return (
    <div className="flex flex-col w-full">
      <Suspense fallback={<div>Loading...</div>}>
        <EditProjectLayout />
      </Suspense>
    </div>
  );
};

export default EditProjectPage;