import React from 'react'
import AssetManagementHistory from '../primary/assets-management/manage-asset/AssetManagementHistory'
import ServiceHistory from '../primary/assets-management/manage-asset/ServiceHistory'
import PrimaryBreadcrumb from '../primary/assets-management/view/PrimaryBreadcrumb'


const ViewAssetLayout = ({ id }) => {
  return (

    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between w-full">
        <div className="layout-header">
          <h1>Assets Management</h1>
          <PrimaryBreadcrumb />
        </div>
      </div>
      <div className="flex flex-col items-center justify-start w-full">
        <AssetManagementHistory assetId={id} />
        <ServiceHistory id={id}/>
      </div>
    </div>
  )
}

export default ViewAssetLayout