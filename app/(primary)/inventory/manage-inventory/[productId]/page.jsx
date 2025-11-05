import React from "react";
import ManageInventoryLayout from "@/components/layouts/manage-inventory-layout";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const ManageInventoryPage = async ({ params }) => {
  const { productId } = await params;
  const session = await getServerSession(authOptions);



  return (
    <div className="flex flex-col w-full">
      <ManageInventoryLayout productId={productId} session={session} />
    </div>
  );
};

export default ManageInventoryPage;
