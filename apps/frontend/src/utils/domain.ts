/**
 * Domain-based interface detection
 */

export type InterfaceType = 'admin' | 'staff' | 'customer';

export const getDomainType = (): InterfaceType => {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // Check for admin domains
  if (hostname.includes('admin') || hostname.includes('-d-admin') || hostname === 'restohand-admin.web.app' || hostname === 'restohand-d-admin.web.app') {
    return 'admin';
  }

  // Check for staff domains
  if (hostname.includes('staff') || hostname.includes('-d-staff') || hostname === 'restohand-staff.web.app' || hostname === 'restohand-d-staff.web.app') {
    return 'staff';
  }

  // Check for customer QR domains
  if (hostname.includes('qr') || hostname.includes('-d-qr') || hostname === 'restohand-qr.web.app' || hostname === 'restohand-d-qr.web.app') {
    return 'customer';
  }

  // For localhost development, check path to determine interface type
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('local')) {
    if (pathname.startsWith('/staff-') || pathname.startsWith('/login') || pathname.startsWith('/kitchen') || pathname.startsWith('/service') || pathname.startsWith('/forbidden') || pathname.startsWith('/redirect')) {
      return 'staff';
    }
    if (pathname.startsWith('/admin')) {
      return 'admin';
    }
    // Customer QR paths for localhost
    if (pathname.startsWith('/c/')) {
      return 'customer';
    }
  }

  // Default to admin for main domains (backward compatibility)
  // This means admin.restohand.com and restohand.com both go to admin
  // while qr.restohand.com goes to customer
  return 'admin';
};

export const isAdminInterface = () => getDomainType() === 'admin';
export const isStaffInterface = () => getDomainType() === 'staff';
export const isCustomerInterface = () => getDomainType() === 'customer';