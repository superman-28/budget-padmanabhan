
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notificationService } from './notificationService';
import { firestoreService } from './firestoreService';

export interface CategoryLink {
  id: string;
  categoryValue: string;
  ownerUserId: string;
  ownerEmail: string;
  linkedUserId: string;
  linkedEmail: string;
  createdAt: any;
}

export const userLinkingService = {
  async linkCategoryToUser(ownerUserId: string, ownerEmail: string, categoryValue: string, linkedEmail: string) {
    try {
      console.log('UserLinkingService: Linking category to user by email:', linkedEmail);
      
      // Find the linked user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', linkedEmail));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        throw new Error('User not found with that email address');
      }
      
      const linkedUserDoc = snapshot.docs[0];
      const linkedUserId = linkedUserDoc.id;
      
      // Create the category link
      const categoryLinksRef = collection(db, 'categoryLinks');
      const linkData = {
        categoryValue,
        ownerUserId,
        ownerEmail,
        linkedUserId,
        linkedEmail,
        createdAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(categoryLinksRef, linkData);
      
      // Send notification to linked user
      await notificationService.addNotification(linkedUserId, {
        type: 'category_link',
        title: 'Category Linked',
        message: `${ownerEmail} has linked the category "${categoryValue}" with you. You'll now receive their transactions in this category.`,
        data: { categoryValue, ownerEmail },
      });
      
      console.log('UserLinkingService: Category linked successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('UserLinkingService: Error linking category:', error);
      throw error;
    }
  },

  async getCategoryLinks(userId: string): Promise<CategoryLink[]> {
    try {
      const categoryLinksRef = collection(db, 'categoryLinks');
      const q = query(categoryLinksRef, where('linkedUserId', '==', userId));
      const snapshot = await getDocs(q);
      
      const links: CategoryLink[] = [];
      snapshot.forEach((doc) => {
        links.push({
          id: doc.id,
          ...doc.data()
        } as CategoryLink);
      });
      
      return links;
    } catch (error) {
      console.error('UserLinkingService: Error getting category links:', error);
      return [];
    }
  },

  async shareTransactionWithLinkedUsers(ownerUserId: string, ownerEmail: string, transaction: any) {
    try {
      console.log('UserLinkingService: Sharing transaction with linked users');
      
      const categories = transaction.category.split(',').map((c: string) => c.trim());
      
      for (const categoryValue of categories) {
        // Find users linked to this category
        const categoryLinksRef = collection(db, 'categoryLinks');
        const q = query(categoryLinksRef, 
          where('ownerUserId', '==', ownerUserId),
          where('categoryValue', '==', categoryValue)
        );
        const snapshot = await getDocs(q);
        
        snapshot.forEach(async (linkDoc) => {
          const link = linkDoc.data() as CategoryLink;
          
          // Add transaction to linked user's account
          await firestoreService.addTransaction(link.linkedUserId, {
            ...transaction,
            description: `${transaction.description} (from ${ownerEmail})`,
          });
          
          // Send notification to linked user
          await notificationService.addNotification(link.linkedUserId, {
            type: 'shared_transaction',
            title: 'New Shared Transaction',
            message: `${ownerEmail} added a new ${transaction.type} of ₹${transaction.amount} in category "${categoryValue}": ${transaction.description}`,
            data: { 
              categoryValue, 
              ownerEmail, 
              amount: transaction.amount,
              type: transaction.type,
              description: transaction.description 
            },
          });
        });
      }
    } catch (error) {
      console.error('UserLinkingService: Error sharing transaction:', error);
    }
  },
};
