/**
 * Domain-based interface detection
 */

export type InterfaceType = 'admin' | 'staff' | 'customer';

export const getDomainType = (): InterfaceType => {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  console.log('🌐 Domain Detection Input:', { hostname, pathname });

  // Check for admin domains (dev.admin.*, admin.*, *-admin.*, *-d-admin.*)
  if (
    hostname.includes('admin') ||
    hostname.includes('-d-admin') ||
    hostname === 'restohand-p-admin.web.app' ||
    hostname === 'restohand-d-admin.web.app' ||
    hostname.startsWith('admin.') ||
    hostname.startsWith('dev.admin.')
  ) {
    console.log('🌐 Detected: admin');
    return 'admin';
  }

  // Check for staff domains (dev.staff.*, staff.*, *-staff.*, *-d-staff.*)
  if (
    hostname.includes('staff') ||
    hostname.includes('-d-staff') ||
    hostname === 'restohand-p-staff.web.app' ||
    hostname === 'restohand-d-staff.web.app' ||
    hostname.startsWith('staff.') ||
    hostname.startsWith('dev.staff.')
  ) {
    console.log('🌐 Detected: staff');
    return 'staff';
  }

  // Check for customer QR domains (dev.qr.*, qr.*, *-qr.*, *-d-qr.*)
  if (
    hostname.includes('qr') ||
    hostname.includes('-d-qr') ||
    hostname === 'restohand-p-qr.web.app' ||
    hostname === 'restohand-d-qr.web.app' ||
    hostname.startsWith('qr.') ||
    hostname.startsWith('dev.qr.')
  ) {
    console.log('🌐 Detected: customer');
    return 'customer';
  }

  // For localhost development, check path to determine interface type
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('local')
  ) {
    if (
      pathname.startsWith('/staff-') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/kitchen') ||
      pathname.startsWith('/service') ||
      pathname.startsWith('/forbidden') ||
      pathname.startsWith('/redirect')
    ) {
      console.log('🌐 Localhost detected: staff');
      return 'staff';
    }
    if (pathname.startsWith('/admin')) {
      console.log('🌐 Localhost detected: admin');
      return 'admin';
    }
    // Customer QR paths for localhost
    if (pathname.startsWith('/c/') || pathname.startsWith('/receipt/')) {
      console.log('🌐 Localhost detected: customer');
      return 'customer';
    }
  }

  // Default to admin for main domains (backward compatibility)
  // This means admin.restohand.com and restohand.com both go to admin
  console.log('🌐 Default: admin');
  return 'admin';
};

export const isAdminInterface = () => getDomainType() === 'admin';
export const isStaffInterface = () => getDomainType() === 'staff';
export const isCustomerInterface = () => getDomainType() === 'customer';
