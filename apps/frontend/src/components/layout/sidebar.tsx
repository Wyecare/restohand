import React, { Fragment, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar as SidebarContainer,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight } from 'lucide-react';

// Example navigation config — replace with your project routes
interface NavigationLink {
  title: string;
  href: string;
  icon?: React.ElementType;
  tag?: string;
  children?: NavigationLink[];
}

interface NavigationGroup {
  title: string;
  links: NavigationLink[];
}

// Example placeholder navigation
const navigation: NavigationGroup[] = [
  {
    title: 'Main',
    links: [
      { title: 'Dashboard', href: '/' },
      {
        title: 'Management',
        href: '/management',
        children: [
          { title: 'Users', href: '/management/users' },
          { title: 'Teams', href: '/management/teams' },
        ],
      },
    ],
  },
  {
    title: 'Settings',
    links: [
      { title: 'Profile', href: '/profile' },
      { title: 'Billing', href: '/billing' },
    ],
  },
];

interface SidebarProps {
  footerContent?: React.ReactNode;
}

export default function Sidebar({ footerContent }: SidebarProps = {}) {
  const location = useLocation();
  const pathname = location.pathname;
  const { setOpenMobile, isMobile } = useSidebar();

  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  const isRouteActive = (href: string) => {
    if (href === pathname) return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  const hasActiveChild = (items: NavigationLink['children'] = []) =>
    items.some((item) => isRouteActive(item.href));

  const displayName = 'User Name';
  const displayInitial = displayName[0] || 'U';

  return (
    <SidebarContainer
      collapsible="icon"
      variant="floating"
      className="bg-background"
    >
      {/* === Header === */}
      <SidebarHeader className="items-center justify-center pt-3 transition-all group-data-[collapsible=icon]:pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="hover:text-foreground group-data-[collapsible=icon]:px-0! hover:bg-primary/10">
                  <Avatar className="size-8">
                    <AvatarImage src="" alt={displayName} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                      {displayInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="truncate font-semibold group-data-[collapsible=icon]:hidden">
                    {displayName}
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/logout">Logout</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* === Navigation Content === */}
      <SidebarContent className="overflow-hidden">
        <ScrollArea className="h-full">
          {navigation.map((group, groupKey) => (
            <SidebarGroup key={groupKey}>
              <SidebarGroupLabel className="text-xs tracking-wider uppercase">
                {group.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {group.links.map((item, itemKey) => (
                    <SidebarMenuItem key={itemKey}>
                      {item.children?.length ? (
                        <Fragment>
                          {/* Collapsed (icon) version */}
                          <div className="hidden group-data-[collapsible=icon]:block">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                  tooltip={item.title}
                                  isActive={hasActiveChild(item.children)}
                                >
                                  {item.icon && (
                                    <item.icon className="size-4" />
                                  )}
                                  <span>{item.title}</span>
                                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                </SidebarMenuButton>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                side={isMobile ? 'bottom' : 'right'}
                                align={isMobile ? 'end' : 'start'}
                                className="min-w-48 rounded-lg"
                              >
                                <DropdownMenuLabel>
                                  {item.title}
                                </DropdownMenuLabel>
                                {item.children.map((subItem, subKey) => (
                                  <DropdownMenuItem asChild key={subKey}>
                                    <Link to={subItem.href}>
                                      {subItem.title}
                                    </Link>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Expanded (normal) version */}
                          <Collapsible
                            className="group/collapsible block group-data-[collapsible=icon]:hidden"
                            defaultOpen={hasActiveChild(item.children)}
                          >
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                tooltip={item.title}
                                isActive={hasActiveChild(item.children)}
                              >
                                {item.icon && <item.icon className="size-4" />}
                                <span>{item.title}</span>
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.children.map((subItem, subKey) => (
                                  <SidebarMenuSubItem key={subKey}>
                                    <SidebarMenuSubButton
                                      isActive={isRouteActive(subItem.href)}
                                      asChild
                                    >
                                      <Link to={subItem.href}>
                                        <span>{subItem.title}</span>
                                        {subItem.tag && (
                                          <SidebarMenuBadge className="ml-auto">
                                            {subItem.tag}
                                          </SidebarMenuBadge>
                                        )}
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </Collapsible>
                        </Fragment>
                      ) : (
                        <SidebarMenuButton
                          asChild
                          tooltip={item.title}
                          isActive={isRouteActive(item.href)}
                        >
                          <Link to={item.href}>
                            {item.icon && <item.icon className="size-4" />}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </ScrollArea>
      </SidebarContent>

      {/* === Footer === */}
      <SidebarFooter>{footerContent}</SidebarFooter>
    </SidebarContainer>
  );
}
