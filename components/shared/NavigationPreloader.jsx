
"use client";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { preloadData } from '@/hooks/use-optimized-fetch-clean';

const ROUTE_PRELOAD_MAP = {
  '/dashboard': [
    '/api/Users',
    '/api/Products', 
    '/api/transfers',
    '/api/activities',
    '/api/stock-adjustment-requests'
  ],
  '/products': [
    '/api/Products'
  ],
  '/inventory': [
    '/api/Inventory',
    '/api/Projects'
  ],
  '/manage-projects': [
    '/api/Projects',
    '/api/Users'
  ],
  '/manage-users': [
    '/api/Users'
  ],
  '/notifications': [
    '/api/stock-adjustment-requests',
    '/api/transfers',
    '/api/activities',
    '/api/Products',
    '/api/Projects',
    '/api/Users'
  ],
  '/reports': [
    '/api/activities'
  ]
};

const NavigationPreloader = () => {
  const pathname = usePathname();

  useEffect(() => {
    
    const preloadCommonRoutes = () => {
      
      preloadData('/api/Products');
      preloadData('/api/Users');
      
      
      const currentRouteKey = Object.keys(ROUTE_PRELOAD_MAP).find(route => 
        pathname.startsWith(route)
      );
      
      if (currentRouteKey) {
        const routesToPreload = ROUTE_PRELOAD_MAP[currentRouteKey];
        routesToPreload.forEach(url => {
          setTimeout(() => preloadData(url), 100); 
        });
      }
    };

    
    const timer = setTimeout(preloadCommonRoutes, 500);
    
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    
    const handleLinkHover = (event) => {
      const link = event.target.closest('a[href]');
      if (!link) return;
      
      const href = link.getAttribute('href');
      const routesToPreload = ROUTE_PRELOAD_MAP[href];
      
      if (routesToPreload) {
        routesToPreload.forEach(url => preloadData(url));
      }
    };

    
    document.addEventListener('mouseover', handleLinkHover);
    
    return () => {
      document.removeEventListener('mouseover', handleLinkHover);
    };
  }, []);

  return null; 
};

export default NavigationPreloader;
