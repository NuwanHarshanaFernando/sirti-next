import "./../globals.css";
import "./../fonts.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import BottomStatusBar from "@/components/shared/bottom-statusbar";

export const metadata = {
  title: "SIRTI Inventory",
  description: "Inventory management system for SIRTI",
};

export default function PrimaryLayout({ children }) {
  return (
    <SidebarProvider style={{
      "--sidebar": "#0b817f",
      "--sidebar-foreground": "white",
      "--sidebar-accent": "rgba(255, 255, 255, 0.2)",
      "--sidebar-accent-foreground": "white"
    }}>
      <AppSidebar />
      <div className="flex flex-row items-start w-full p-8">
        <main className="flex flex-row items-start w-full">
          {children}
        </main>
        <BottomStatusBar />
      </div>
    </SidebarProvider>
  );
}