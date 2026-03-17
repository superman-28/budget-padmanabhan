
const PERMISSION_KEY = 'web_notification_permission_asked';

export const webNotificationService = {
  isSupported(): boolean {
    return 'Notification' in window;
  },

  getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.isSupported()) return 'unsupported';
    
    const permission = await Notification.requestPermission();
    localStorage.setItem(PERMISSION_KEY, 'true');
    return permission;
  },

  hasAskedPermission(): boolean {
    return localStorage.getItem(PERMISSION_KEY) === 'true';
  },

  showNotification(title: string, options?: { body?: string; icon?: string; tag?: string; data?: any }) {
    if (!this.isSupported() || Notification.permission !== 'granted') return;

    try {
      const notification = new Notification(title, {
        body: options?.body,
        icon: options?.icon || '/favicon.ico',
        tag: options?.tag, // prevents duplicate notifications with same tag
        badge: '/favicon.ico',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 6 seconds
      setTimeout(() => notification.close(), 6000);
    } catch (error) {
      console.error('WebNotificationService: Error showing notification:', error);
    }
  },
};
