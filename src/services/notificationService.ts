
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  orderBy, 
  onSnapshot,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Notification {
  id: string;
  userId: string;
  type: 'category_link' | 'shared_transaction' | 'category_unlink' | 'shared_transaction_removed';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: any;
}

export const notificationService = {
  async addNotification(userId: string, notificationData: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>) {
    try {
      console.log('NotificationService: Adding notification for user:', userId);
      const userNotificationsRef = collection(db, 'users', userId, 'notifications');
      const docRef = await addDoc(userNotificationsRef, {
        ...notificationData,
        userId,
        read: false,
        createdAt: Timestamp.now(),
      });
      console.log('NotificationService: Notification added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('NotificationService: Error adding notification:', error);
      throw error;
    }
  },

  async markAsRead(userId: string, notificationId: string) {
    try {
      const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
      });
    } catch (error) {
      console.error('NotificationService: Error marking notification as read:', error);
      throw error;
    }
  },

  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    console.log('NotificationService: Setting up notifications subscription for user:', userId);
    const userNotificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(userNotificationsRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, 
      (snapshot) => {
        console.log('NotificationService: Notifications snapshot received, count:', snapshot.size);
        const notifications: Notification[] = [];
        snapshot.forEach((doc) => {
          notifications.push({
            id: doc.id,
            ...doc.data()
          } as Notification);
        });
        callback(notifications);
      },
      (error) => {
        console.error('NotificationService: Error in notifications subscription:', error);
        callback([]);
      }
    );
  },
};
