import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';

const Layout = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-muted/10 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;