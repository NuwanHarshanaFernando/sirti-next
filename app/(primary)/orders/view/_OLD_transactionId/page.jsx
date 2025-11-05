import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import OrderViewLayout from "@/components/layouts/order-view-layout";

const page = async ({ params }) => {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'keeper') {
    redirect('/dashboard');
  }

  const { transactionId } = await params;

  return (
    <div className="flex flex-col w-full">
      <OrderViewLayout session={session} transactionId={transactionId} />
    </div>
  );
};

export default page;
