import { useMemo } from 'react';
import { navigationGroups, NavigationGroup, NavigationLink } from '@/routes/navigation';
import { useAppSelector } from '@/store/hooks';
import {
  selectUserPermissions,
  selectCurrentContext,
  selectUserType
} from '@/store/slices/authSlice';
import { hasPermission } from '@/lib/permissions';

const cloneLink = (link: NavigationLink): NavigationLink => ({
  ...link,
  children: link.children ? link.children.map((child) => ({ ...child })) : undefined,
});

export const useNavigation = (): NavigationGroup[] => {
  const permissions = useAppSelector(selectUserPermissions);
  const currentContext = useAppSelector(selectCurrentContext);
  const userType = useAppSelector(selectUserType);

  return useMemo(() => {
    return navigationGroups
      .map((group) => {
        const filteredLinks = group.links
          .map(cloneLink)
          .map((link) => {
            // Filter children based on context and permissions
            if (link.children && link.children.length > 0) {
              link.children = link.children.filter((child) => {
                // Check context compatibility
                const contextAllowed =
                  !child.context ||
                  child.context === 'both' ||
                  child.context === currentContext;

                // Check permissions
                const permissionAllowed = hasPermission(
                  permissions,
                  child.requiredPermissions,
                  child.requireAllPermissions
                );

                return contextAllowed && permissionAllowed;
              });
            }
            return link;
          })
          .filter((link) => {
            // Check context compatibility for the main link
            const contextAllowed =
              !link.context ||
              link.context === 'both' ||
              link.context === currentContext;

            // Check permissions for the main link
            const permissionAllowed = hasPermission(
              permissions,
              link.requiredPermissions,
              link.requireAllPermissions
            );

            // Include if link is allowed or has allowed children
            return (contextAllowed && permissionAllowed) ||
              (link.children && link.children.length > 0);
          });

        return {
          ...group,
          links: filteredLinks,
        };
      })
      .filter((group) => group.links.length > 0);
  }, [permissions, currentContext, userType]);
};

export default useNavigation;
