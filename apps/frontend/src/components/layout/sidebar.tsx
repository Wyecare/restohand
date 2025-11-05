import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCommonTranslation } from '@/hooks/use-translation';
import {
  Sidebar as SidebarContainer,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Users,
  Table,
  QrCode,
  BarChart3,
  Settings,
  ChefHat,
  Coffee,
  Package,
  BookOpen,
  CreditCard,
} from 'lucide-react';

interface NavLink {
  titleKey: string;
  href: string;
  icon: React.ElementType;
}

const managerLinks: NavLink[] = [
  {
    titleKey: 'navigation.dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  { titleKey: 'navigation.orders', href: '/orders', icon: ShoppingBag },
  { titleKey: 'navigation.menu', href: '/menu', icon: UtensilsCrossed },
  // { titleKey: 'navigation.inventory', href: '/inventory', icon: Package },
  // { titleKey: 'navigation.recipes', href: '/recipes', icon: BookOpen },
  { titleKey: 'navigation.tables', href: '/tables', icon: Table },
  { titleKey: 'navigation.staff', href: '/staff', icon: Users },
  { titleKey: 'navigation.customerQR', href: '/customer-qr', icon: QrCode },
  { titleKey: 'navigation.reports', href: '/reports', icon: BarChart3 },
  {
    titleKey: 'navigation.subscription',
    href: '/subscription',
    icon: CreditCard,
  },
  { titleKey: 'navigation.settings', href: '/settings', icon: Settings },
];

const kitchenLinks: NavLink[] = [
  { titleKey: 'navigation.kitchenBoard', href: '/kitchen', icon: ChefHat },
];

const serviceLinks: NavLink[] = [
  { titleKey: 'navigation.serviceBoard', href: '/service', icon: Coffee },
];

export default function Sidebar() {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const { user } = useAuth();
  const session = useAppSelector(selectAuthSession);
  const roles = useAppSelector(selectUserRoles);
  const { t } = useCommonTranslation();

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname, isMobile, setOpenMobile]);

  const navLinks = useMemo(() => {
    if (roles.includes('manager')) return managerLinks;
    if (roles.includes('chef')) return kitchenLinks;
    if (roles.includes('waiter') || roles.includes('cashier'))
      return serviceLinks;
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

  const isRouteActive = (href: string) => {
    if (href === location.pathname) return true;
    if (href !== '/' && location.pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <SidebarContainer
      collapsible="icon"
      variant="floating"
      className="bg-background"
    >
      {/* Header */}
      <SidebarHeader className="items-center justify-center pt-3 transition-all group-data-[collapsible=icon]:pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="hover:text-foreground group-data-[collapsible=icon]:px-0! hover:bg-primary/10">
              <Avatar className="size-8">
                <AvatarImage
                  src={user?.photoURL ?? undefined}
                  alt={displayName}
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="truncate font-semibold group-data-[collapsible=icon]:hidden">
                {displayName}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content with proper group structure */}
      <SidebarContent className="overflow-hidden">
        <ScrollArea className="h-full">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs tracking-wider uppercase">
              {t('navigation.navigation')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;

                  return (
                    <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton
                        className="hover:text-foreground active:text-foreground hover:bg-primary/10 active:bg-primary/10"
                        asChild
                        tooltip={t(link.titleKey)}
                        isActive={isRouteActive(link.href)}
                      >
                        <Link to={link.href}>
                          <Icon className="size-4" />
                          <span>{t(link.titleKey)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-border/40">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="hover:bg-transparent group-data-[collapsible=icon]:px-0!">
              {/* Logo - always visible */}
              <div className="flex-shrink-0">
                <img
                  src="/wyecare-logo.png"
                  alt="Wyecare Solutions"
                  className="size-8 object-contain"
                />
              </div>

              {/* Text - only visible when expanded */}
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-semibold text-foreground">
                  Restohand POS
                </span>
                <span className="text-xs text-muted-foreground">
                  from Wyecare Solutions
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Policy Links - only visible when expanded */}
          <div className="group-data-[collapsible=icon]:hidden">
            <SidebarMenuItem>
              <div className="px-3 py-2 space-y-1">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Link
                    to="/privacy-policy"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Privacy
                  </Link>
                  <span className="text-muted-foreground">•</span>
                  <Link
                    to="/terms-conditions"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Terms
                  </Link>
                  <span className="text-muted-foreground">•</span>
                  <Link
                    to="/refund-policy"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Refunds
                  </Link>
                </div>
                <div className="flex gap-2 text-xs">
                  <Link
                    to="/about-us"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    About Us
                  </Link>
                  <span className="text-muted-foreground">•</span>
                  <Link
                    to="/contact-us"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            </SidebarMenuItem>
          </div>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarContainer>
  );
}
