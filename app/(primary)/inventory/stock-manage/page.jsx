import React from "react";
import StockManageLayout from "@/components/layouts/stock-manage-layout";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const page = async ({ searchParams }) => {
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

  const params = await searchParams;
  const type = params?.type || 'in';

  return (
    <div className="flex flex-col w-full">
      <StockManageLayout session={session} type={type} />
    </div>
  );
};

export default page;
