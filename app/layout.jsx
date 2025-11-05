import './globals.css';
import './fonts.css';
import "react-day-picker/style.css";
import AuthProvider from '@/components/auth/provider';
import { SocketProvider } from '@/contexts/SocketContext';
import { Toaster } from '@/components/ui/sonner';

export const metadata = {
  title: 'SIRTI Inventory',
  description: 'Inventory management system for SIRTI',
};

export default function RootLayout({ children }) {
  return (
    <html className="antialiased scroll-smooth" lang="en">
      <body className="font-sans" cz-shortcut-listen="true">
        <AuthProvider>
          <SocketProvider>
            {children}
            <Toaster position="bottom-right" />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
} 