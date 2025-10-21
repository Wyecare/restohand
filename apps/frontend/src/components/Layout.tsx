// components/layout/Layout.tsx - Updated with shadcn components
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import Sidebar from './layout/sidebar';
import Header from './layout/header';

export default function Layout() {
  const [defaultOpen, setDefaultOpen] = useState(true);

  useEffect(() => {
    const sidebarState = localStorage.getItem('sidebar_state');
    setDefaultOpen(sidebarState === 'true' || sidebarState === null);
  }, []);

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar />
      <SidebarInset>
        <Header />
        <div className="p-3 md:p-1 lg:p-1 @container/main xl:group-data-[theme-content-layout=centered]/layout:container xl:group-data-[theme-content-layout=centered]/layout:mx-auto xl:group-data-[theme-content-layout=centered]/layout:mt-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
