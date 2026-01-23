// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyBl9e0TLg0EGOfkzrr0iHpHv_pjlmyGMAE',
  authDomain: 'restohand-d.firebaseapp.com',
  projectId: 'restohand-d',
  storageBucket: 'restohand-d-firebase',
  messagingSenderId: '108580614304833125785',
  appId: '1:108580614304833125785:web:your-app-id',
  measurementId: 'G-YOUR-MEASUREMENT-ID'
};

// Initialize Firebase in service worker
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // Extract notification data
  const notificationTitle = payload.notification?.title || 'Call Waiter Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'Customer needs assistance',
    icon: '/icons/waiter-call.png',
    badge: '/icons/badge.png',
    tag: payload.data?.callId || 'call-waiter-alert',
    data: payload.data,
    requireInteraction: payload.data?.urgency === 'urgent',
    vibrate: payload.data?.urgency === 'urgent' ? [200, 100, 200] : [100],
    actions: [
      {
        action: 'acknowledge',
        title: 'Acknowledge',
        icon: '/icons/check.png'
      },
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/view.png'
      }
    ]
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);

  const { notification, action } = event;
  const data = notification.data;

  // Close the notification
  notification.close();

  if (action === 'acknowledge') {
    // Handle acknowledge action
    // This would typically make an API call to acknowledge the alert
    event.waitUntil(
      fetch(`/api/call-waiter/${data.callId}/acknowledge`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.authToken}` // Note: You'd need to store this securely
        },
        body: JSON.stringify({})
      }).catch(error => {
        console.error('Failed to acknowledge call:', error);
      })
    );
  } else if (action === 'view' || !action) {
    // Handle view action or default click
    const urlToOpen = `/command-center?tab=alerts&call=${data.callId}`;

    // Focus existing window or open new one
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        // Try to find an existing window to focus
        for (const client of clientList) {
          if (client.url.includes('/command-center') && 'focus' in client) {
            return client.focus().then(() => {
              // Send message to focus on the specific alert
              client.postMessage({
                type: 'FOCUS_CALL_ALERT',
                callId: data.callId
              });
            });
          }
        }

        // No existing window found, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Handle notification close events
self.addEventListener('notificationclose', function(event) {
  console.log('[firebase-messaging-sw.js] Notification closed:', event.notification.data);
});

// Handle push events (fallback for when Firebase doesn't handle it)
self.addEventListener('push', function(event) {
  if (event.data) {
    console.log('[firebase-messaging-sw.js] Push event received:', event.data.text());

    try {
      const payload = event.data.json();

      const notificationOptions = {
        body: payload.body || 'Customer needs assistance',
        icon: '/icons/waiter-call.png',
        badge: '/icons/badge.png',
        tag: 'call-waiter-alert',
        requireInteraction: true,
        vibrate: [200, 100, 200]
      };

      event.waitUntil(
        self.registration.showNotification(
          payload.title || 'Call Waiter Alert',
          notificationOptions
        )
      );
    } catch (error) {
      console.error('[firebase-messaging-sw.js] Error parsing push data:', error);
    }
  }
});

console.log('[firebase-messaging-sw.js] Service worker loaded and ready for FCM');