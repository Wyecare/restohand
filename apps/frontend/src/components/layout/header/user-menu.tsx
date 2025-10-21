import React from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  Bell,
  CreditCard,
  LogOut,
  Settings,
  User,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserMenuProps {
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
  };
  onLogout?: () => void;
}

export default function UserMenu({ user, onLogout }: UserMenuProps) {
  const initials =
    user?.firstName?.[0]?.toUpperCase() ??
    user?.lastName?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    'U';

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    'User';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer">
          <AvatarImage src={user?.avatarUrl} alt={fullName} />
          <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-60"
        align="end"
      >
        {/* Header */}
        <DropdownMenuLabel className="p-0">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar>
              <AvatarImage src={user?.avatarUrl} alt={fullName} />
              <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{fullName}</span>
              <span className="text-muted-foreground truncate text-xs">
                {user?.email ?? ''}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  Active
                </Badge>
              </div>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Menu Items */}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/profile">
              <User />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <Settings />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/account">
              <BadgeCheck />
              Account
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/billing">
              <CreditCard />
              Billing
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/notifications">
              <Bell />
              Notifications
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem
          onClick={onLogout}
          className="text-red-600 dark:text-red-400"
        >
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
