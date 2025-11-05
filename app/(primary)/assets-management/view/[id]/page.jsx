import React from 'react'
import ViewAssetLayout from "@/components/layouts/view-asset-layout";

const page = async ({params}) => {
  const { id } = await params;
  return (
    <div className="flex flex-col w-full">
      <ViewAssetLayout id={id} />
    </div>
  )
}

export default page