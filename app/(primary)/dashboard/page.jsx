import DashboardLayout from '@/components/layouts/dashboard-layout';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const sessionData = await getServerSession(authOptions);
  
  if (!sessionData) {
    redirect('/login');
  }
  
  const session = {
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
  };

  return (
    <div className='flex flex-col w-full'>
      <DashboardLayout session={session} />
    </div>
  );
}