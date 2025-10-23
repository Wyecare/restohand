import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar as SidebarContainer,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthProvider';
import { useAppSelector } from '@/store/hooks';
import { selectAuthSession, selectUserRoles } from '@/store/slices/authSlice';

interface NavLink {
  title: string;
  href: string;
}

const managerLinks: NavLink[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Orders', href: '/orders' },
  { title: 'Menu', href: '/menu' },
  { title: 'Staff', href: '/staff' },
  { title: 'Tables', href: '/tables' },
  { title: 'Customer QR', href: '/customer-qr' },
  { title: 'Reports', href: '/reports' },
  { title: 'Settings', href: '/settings' },
  { title: 'Floor Plan', href: '/floor-plan' },
];

const kitchenLinks: NavLink[] = [{ title: 'Kitchen Board', href: '/kitchen' }];

const serviceLinks: NavLink[] = [{ title: 'Service Board', href: '/service' }];

export default function Sidebar() {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const { user } = useAuth();
  const session = useAppSelector(selectAuthSession);
  const roles = useAppSelector(selectUserRoles);

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);

  const navLinks = useMemo(() => {
    if (roles.includes('manager')) {
      return managerLinks;
    }
    if (roles.includes('chef')) {
      return kitchenLinks;
    }
    if (roles.includes('waiter') || roles.includes('cashier')) {
      return serviceLinks;
    }
    return [];
  }, [roles]);

  const displayName =
    session?.displayName ?? user?.displayName ?? user?.email ?? 'User';
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U';

  return (
    <SidebarContainer collapsible="icon" variant="floating">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarImage src={user?.photoURL ?? undefined} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            {session?.roles && (
              <p className="text-xs text-muted-foreground truncate">
                {session.roles.join(', ')}
              </p>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full px-2">
          <SidebarMenu>
            {navLinks.map((link) => {
              const isActive =
                location.pathname === link.href ||
                (link.href !== '/' && location.pathname.startsWith(link.href));
              return (
                <SidebarMenuItem key={link.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={link.title}
                  >
                    <Link to={link.href}>{link.title}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
        Restohand POS
      </SidebarFooter>
    </SidebarContainer>
  );
}
