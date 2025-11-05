import React from "react";
import MergedInventoryLayout from "@/components/layouts/merged-inventory-layout";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const page = async () => {
  const sessionData = await getServerSession(authOptions);
  
  const session = sessionData ? {
    user: {
      name: sessionData.user?.name,
      email: sessionData.user?.email,
      image: sessionData.user?.image,
      role: sessionData.user?.role,
      id: sessionData.user?.id,
      availableProjects: sessionData.user?.availableProjects,
      projects: sessionData.user?.projects ? 
        sessionData.user.projects.map(p => ({
          _id: p._id?.toString(),
          name: p.name,
          description: p.description,
        })) : []
    }
  } : null;
  
  return (
    <div className="flex flex-col w-full">
      <MergedInventoryLayout session={session} />
    </div>
  );
};

export default page;