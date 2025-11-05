"use client";

import {
  LayoutDashboard,
  Archive,
  HardHat,
  FileChartColumn,
  FolderLock,
  CircleUser,
  Bell,
  Settings,
  LogOut,
  ClockArrowUp,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SecondaryLogo } from "@/components/icons/icons";
import { useNotificationCount } from "@/hooks/use-notification-count-simplified";

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Inventory",
    url: "/inventory",
    icon: Archive,
  },
  {
    title: "Assets Management",
    url: "/assets-management",
    icon: HardHat,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileChartColumn,
  },
  {
    title: "Manage Projects",
    url: "/manage-projects",
    icon: FolderLock,
  },
  {
    title: "Transfers",
    url: "/transfers",
    icon: ClockArrowUp,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { unreadCount, loading } = useNotificationCount();


  const handleLogout = async () => {
    try {
      await signOut({
        callbackUrl: "/login",
        redirect: true,
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isAuthenticated = status === 'authenticated';
  const isAdmin = isAuthenticated && session?.user?.role === "admin";
  const isKeeper = isAuthenticated && session?.user?.role === "keeper";
  const isManager = isAuthenticated && session?.user?.role === "manager";

  const filteredItems = items.filter((item) => {
    // Dashboard should be visible to all roles

    // Non-admins: allow Assets for managers, but hide Reports and Manage Projects
    if (!isAdmin) {
      if (item.url === "/reports" || item.url === "/manage-projects") {
        return false;
      }
      if (isKeeper && item.url === "/assets-management") {
        return false;
      }
    }
    return true;
  });

  const secondMenuItems = [
    {
      title: "Manage Users",
      url: "/manage-users",
      icon: CircleUser,
      adminOnly: true,
    },
    {
      title: "Notifications",
      url: "/notifications",
      icon: Bell,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      adminOnly: true,
    },
    {
      title: "Logout",
      url: "#",
      icon: LogOut,
      onClick: handleLogout,
    },
  ];

  const filteredSecondMenuItems = secondMenuItems.filter((item) => {
    if (item.adminOnly && !isAdmin) {
      return false;
    }
    return true;
  });

  return (
    <Sidebar className="h-screen">
      <SidebarHeader>
        <div className="flex justify-center items-center px-3 gap-2 h-[70px] bg-white">
          <SecondaryLogo className="w-full" />
        </div>
      </SidebarHeader>
      <SidebarContent className="mt-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                let isActive;
                if (item.url === "/transfers") {
                  isActive =
                    pathname === item.url ||
                    pathname.startsWith("/transfers") ||
                    pathname.startsWith("/orders");
                } else {
                  isActive =
                    pathname === item.url ||
                    (item.url !== "/" && pathname.startsWith(item.url));
                }
                return (
                  <SidebarMenuItem
                    key={item.title}
                    className="w-[40px] h-[40px]"
                  >
                    <SidebarMenuButton
                      asChild
                      className="flex items-center justify-center"
                      isActive={isActive}
                      title={item.title}
                    >
                      <Link
                        href={item.url}
                        className="flex flex-col items-center justify-center w-full h-full"
                      >
                        <item.icon className="!w-6 !h-6" />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarContent className="!justify-end mb-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="flex flex-col">
              {filteredSecondMenuItems.map((item) => {
                const isActive =
                  pathname === item.url ||
                  (item.url !== "/" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem
                    key={item.title}
                    className="w-[40px] h-[40px]"
                  >
                    {item.onClick ? (
                      <SidebarMenuButton
                        onClick={item.onClick}
                        className="flex items-center justify-center !w-full !h-full cursor-pointer"
                        isActive={isActive}
                        title={item.title}
                      >
                        <item.icon className="!w-6 !h-6" />
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        className="flex items-center justify-center !w-full !h-full"
                        isActive={isActive}
                        title={item.title}
                      >
                        <Link
                          href={item.url}
                          className="relative flex flex-col items-center justify-center w-full h-full"
                        >
                          <item.icon className="!w-6 !h-6" />
                          {item.title === "Notifications" &&
                            unreadCount > 0 && (
                              <div className="absolute w-2 h-2 bg-white rounded-full right-3 top-1.5"></div>
                            )}
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
