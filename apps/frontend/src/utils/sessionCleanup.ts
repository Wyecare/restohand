/**
 * Utility functions for cleaning up customer session data from localStorage
 * after payment completion or session closure
 */

export interface SessionCleanupOptions {
  sessionId?: string;
  tableId?: string;
  clearAll?: boolean;
}

/**
 * Clears customer session data from localStorage
 */
export function clearCustomerSessionData(options: SessionCleanupOptions = {}): void {
  const { sessionId, tableId, clearAll = false } = options;

  try {
    // Always clear payment session data
    localStorage.removeItem('lastPaymentSession');

    if (clearAll) {
      // Clear all session-related data
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (
          key.startsWith('customerSession_') ||
          key.startsWith('browserSession') ||
          key.startsWith('tableSession_') ||
          key.includes('session')
        ) {
          localStorage.removeItem(key);
        }
      });

      localStorage.removeItem('browserSessionId');
      console.log('🧹 All customer session data cleared');
      return;
    }

    // Clear session-specific data
    if (sessionId) {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes(sessionId) || key.startsWith(`customerSession_${sessionId}`)) {
          localStorage.removeItem(key);
        }
      });

      // Clear browser session ID as session is complete
      localStorage.removeItem('browserSessionId');
      console.log(`✨ Session ${sessionId} data cleared from localStorage`);
    }

    // Clear table-specific data if provided
    if (tableId) {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes(tableId) || key.startsWith(`tableSession_${tableId}`)) {
          localStorage.removeItem(key);
        }
      });
      console.log(`🧹 Table ${tableId} data cleared from localStorage`);
    }

  } catch (error) {
    console.error('Error clearing session data:', error);
  }
}

/**
 * Checks if customer session data exists in localStorage
 */
export function hasCustomerSessionData(sessionId?: string): boolean {
  try {
    const keys = Object.keys(localStorage);

    if (sessionId) {
      return keys.some(key =>
        key.includes(sessionId) ||
        key.startsWith(`customerSession_${sessionId}`)
      );
    }

    return keys.some(key =>
      key.startsWith('customerSession_') ||
      key.startsWith('browserSession') ||
      key === 'browserSessionId' ||
      key === 'lastPaymentSession'
    );
  } catch (error) {
    console.error('Error checking session data:', error);
    return false;
  }
}

/**
 * Clears expired session data (older than specified time)
 */
export function clearExpiredSessionData(maxAge: number = 24 * 60 * 60 * 1000): void {
  try {
    const now = Date.now();
    const keys = Object.keys(localStorage);

    keys.forEach(key => {
      if (key.startsWith('customerSession_') || key === 'lastPaymentSession') {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            const timestamp = parsed.timestamp ? new Date(parsed.timestamp).getTime() : 0;

            if (now - timestamp > maxAge) {
              localStorage.removeItem(key);
              console.log(`🗑️ Expired session data cleared: ${key}`);
            }
          }
        } catch (parseError) {
          // Remove invalid data
          localStorage.removeItem(key);
          console.log(`🗑️ Invalid session data cleared: ${key}`);
        }
      }
    });
  } catch (error) {
    console.error('Error clearing expired session data:', error);
  }
}