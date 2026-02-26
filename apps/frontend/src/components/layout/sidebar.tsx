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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSidebar } from '@/components/ui/sidebar';
import { useJwtAuth } from '@/contexts/JwtAuthProvider';
import { useAppSelector } from '@/store/hooks';
import { selectAuthSession, selectUserRoles } from '@/store/slices/authSlice';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Users,
  Table,
  BarChart3,
  Settings,
  ChefHat,
  Coffee,
  Package,
  CreditCard,
  Building2,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const logoDark = '/logo_black.png';
const logoWhite = '/logo_white.png';

interface SubNavItem {
  titleKey: string;
  href: string;
}

interface NavLink {
  titleKey: string;
  href: string;
  icon: React.ElementType;
  items?: SubNavItem[];
}
const managerLinks: NavLink[] = [
  {
    titleKey: 'navigation.dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  // { titleKey: 'navigation.orders', href: '/orders', icon: ShoppingBag },
  // Orders moving into sub menu oreders and sessions
  {
    titleKey: 'navigation.orders',
    href: '/orders',
    icon: ShoppingBag,
    items: [
      { titleKey: 'navigation.orders', href: '/orders/list' },
      { titleKey: 'navigation.sessions', href: '/orders/sessions' },
    ],
  },

  {
    titleKey: 'navigation.menu',
    href: '/menu',
    icon: UtensilsCrossed,
    items: [
      { titleKey: 'navigation.items', href: '/menu/items' },
      { titleKey: 'navigation.modifiers', href: '/menu/modifiers' },
    ],
  },
  {
    titleKey: 'navigation.inventory',
    href: '/inventory',
    icon: Package,
    items: [
      { titleKey: 'navigation.items', href: '/inventory/items' },
      { titleKey: 'navigation.suppliers', href: '/inventory/suppliers' },
      { titleKey: 'navigation.purchaseOrders', href: '/inventory/purchase-orders' },
      { titleKey: 'navigation.transferOrders', href: '/inventory/transfer-orders' },
      { titleKey: 'navigation.inventoryCounts', href: '/inventory/counts' },
    ],
  },
  { titleKey: 'navigation.branches', href: '/branches', icon: Building2 },
  // { titleKey: 'navigation.recipes', href: '/recipes', icon: BookOpen },
  {
    titleKey: 'navigation.zonesAndTables',
    href: '/tables',
    icon: Table,
    items: [
      { titleKey: 'navigation.tables', href: '/tables/management' },
      { titleKey: 'navigation.zones', href: '/tables/zones' },
      { titleKey: 'navigation.heatMap', href: '/tables/heatmap' },
    ],
  },
  // { titleKey: 'navigation.commandCenter', href: '/command-center', icon: Monitor },
  { titleKey: 'navigation.staff', href: '/staff', icon: Users },
  // { titleKey: 'navigation.customerQR', href: '/customer-qr', icon: QrCode },
  { titleKey: 'navigation.reports', href: '/reports', icon: BarChart3 },
  {
    titleKey: 'navigation.subscription',
    href: '/subscription',
    icon: CreditCard,
  },
  { titleKey: 'navigation.kyc', href: '/kyc', icon: Shield },
  {
    titleKey: 'navigation.settings',
    href: '/settings',
    icon: Settings,
    items: [
      { titleKey: 'navigation.restaurant', href: '/settings/restaurant' },
      { titleKey: 'navigation.gst', href: '/settings/gst' },
      { titleKey: 'navigation.charges', href: '/settings/charges' },
    ],
  },
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
  const { user } = useJwtAuth();
  const session = useAppSelector(selectAuthSession);
  const roles = useAppSelector(selectUserRoles);
  const { t } = useCommonTranslation();

  const { theme } = useTheme();

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

  const isParentActive = (link: NavLink) => {
    if (link.items) {
      return link.items.some((item) => isRouteActive(item.href));
    }
    return isRouteActive(link.href);
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

                  // If the link has nested items, render as collapsible
                  if (link.items && link.items.length > 0) {
                    return (
                      <Collapsible
                        key={link.href}
                        asChild
                        defaultOpen={isParentActive(link)}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              tooltip={t(link.titleKey)}
                              isActive={isParentActive(link)}
                              className="hover:text-foreground active:text-foreground hover:bg-primary/10 active:bg-primary/10"
                            >
                              <Icon className="size-4" />
                              <span>{t(link.titleKey)}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {link.items.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.href}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={isRouteActive(subItem.href)}
                                  >
                                    <Link to={subItem.href}>
                                      <span>{t(subItem.titleKey)}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  // Regular link without nested items
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
              {/* Text - only visible when expanded */}
              <div className="flex flex-col group-data-[collapsible=icon]:hidden w-full ">
                <img
                  src={theme === 'light' ? logoDark : logoWhite}
                  alt="RestoHand Logo"
                  className="h-6 w-fit mx-auto"
                />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarContainer>
  );
}
