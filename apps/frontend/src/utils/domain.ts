/**
 * Domain-based interface detection
 */

export type InterfaceType = 'admin' | 'staff' | 'customer';

export const getDomainType = (): InterfaceType => {
  const hostname = window.location.hostname;

  // Check for admin domains
  if (hostname.includes('admin') || hostname.includes('-d-admin') || hostname === 'restohand-admin.web.app' || hostname === 'restohand-d-admin.web.app') {
    return 'admin';
  }

  // Check for staff domains
  if (hostname.includes('staff') || hostname.includes('-d-staff') || hostname === 'restohand-staff.web.app' || hostname === 'restohand-d-staff.web.app') {
    return 'staff';
  }

  // Default to customer for public domains
  return 'customer';
};

export const isAdminInterface = () => getDomainType() === 'admin';
export const isStaffInterface = () => getDomainType() === 'staff';
export const isCustomerInterface = () => getDomainType() === 'customer';