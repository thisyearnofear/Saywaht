/**
 * PWA utility functions for service worker management and offline functionality
 */

export interface PWAStatus {
  isSupported: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  hasServiceWorker: boolean;
}

/**
 * Check PWA support and status
 */
export function getPWAStatus(): PWAStatus {
  if (typeof window === 'undefined') {
    return {
      isSupported: false,
      isInstalled: false,
      isOnline: false,
      hasServiceWorker: false,
    };
  }

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
  const isOnline = navigator.onLine;
  const hasServiceWorker = 'serviceWorker' in navigator && 
    navigator.serviceWorker.controller !== null;

  return {
    isSupported,
    isInstalled,
    isOnline,
    hasServiceWorker,
  };
}

/**
 * Register service worker with error handling
 */
export async function registerServiceWorker(swPath: string = '/sw.js'): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(swPath);
    console.log('Service Worker registered successfully:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      return await registration.unregister();
    }
    return false;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
}

/**
 * Check if app can be installed
 */
export function canInstallApp(): boolean {
  return !getPWAStatus().isInstalled && getPWAStatus().isSupported;
}

/**
 * Send message to service worker
 */
export async function sendMessageToSW(message: any): Promise<any> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker not supported');
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration || !registration.active) {
    throw new Error('Service Worker not active');
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data);
      }
    };

    // TypeScript knows registration.active is not null due to the check above
    registration.active!.postMessage(message, [messageChannel.port2]);
  });
}

/**
 * Cache management utilities
 */
export const cacheManager = {
  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
  },

  /**
   * Clear specific cache
   */
  async clear(cacheName: string): Promise<boolean> {
    if ('caches' in window) {
      return await caches.delete(cacheName);
    }
    return false;
  },

  /**
   * Get cache size
   */
  async getSize(): Promise<number> {
    if (!('caches' in window) || !('estimate' in navigator.storage)) {
      return 0;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  },

  /**
   * Check if resource is cached
   */
  async has(url: string): Promise<boolean> {
    if (!('caches' in window)) {
      return false;
    }

    try {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const response = await cache.match(url);
        if (response) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking cache:', error);
      return false;
    }
  }
};

/**
 * Background sync utilities
 */
export const backgroundSync = {
  /**
   * Register background sync
   */
  async register(tag: string): Promise<void> {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      throw new Error('Background sync not supported');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(tag);
    } catch (error) {
      console.error('Background sync registration failed:', error);
      throw error;
    }
  },

  /**
   * Get registered sync tags
   */
  async getTags(): Promise<string[]> {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      return [];
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      return await (registration as any).sync.getTags();
    } catch (error) {
      console.error('Error getting sync tags:', error);
      return [];
    }
  }
};

/**
 * Push notification utilities
 */
export const pushNotifications = {
  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    return await Notification.requestPermission();
  },

  /**
   * Subscribe to push notifications
   */
  async subscribe(vapidKey: string): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications not supported');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey
      });
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  },

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        return await subscription.unsubscribe();
      }
      return false;
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      return false;
    }
  }
};