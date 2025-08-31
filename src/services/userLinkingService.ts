
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
      console.log('UserLinkingService: Owner details:', { ownerUserId, ownerEmail, categoryValue });
      
      // Normalize email (trim and lowercase)
      const normalizedEmail = linkedEmail.trim().toLowerCase();
      console.log('UserLinkingService: Normalized email:', normalizedEmail);
      
      // Check if trying to link to self
      if (normalizedEmail === ownerEmail.toLowerCase()) {
        throw new Error('You cannot link a category to yourself');
      }
      
      // Find the linked user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', normalizedEmail));
      const snapshot = await getDocs(q);
      
      console.log('UserLinkingService: Found users with email:', snapshot.size);
      
      if (snapshot.empty) {
        // Try with original case
        const qOriginal = query(usersRef, where('email', '==', linkedEmail.trim()));
        const snapshotOriginal = await getDocs(qOriginal);
        
        console.log('UserLinkingService: Found users with original case email:', snapshotOriginal.size);
        
        if (snapshotOriginal.empty) {
          throw new Error(`User not found with email address: ${linkedEmail}. Make sure the user has signed up to the app.`);
        }
        
        // Use the original case result
        const linkedUserDoc = snapshotOriginal.docs[0];
        const linkedUserId = linkedUserDoc.id;
        console.log('UserLinkingService: Found user ID:', linkedUserId);
        
        return await this.createCategoryLinkWithHistory(ownerUserId, ownerEmail, categoryValue, linkedUserId, linkedEmail, linkedUserDoc.data().email);
      }
      
      const linkedUserDoc = snapshot.docs[0];
      const linkedUserId = linkedUserDoc.id;
      console.log('UserLinkingService: Found user ID:', linkedUserId);
      
      return await this.createCategoryLinkWithHistory(ownerUserId, ownerEmail, categoryValue, linkedUserId, linkedEmail, linkedUserDoc.data().email);
    } catch (error) {
      console.error('UserLinkingService: Error linking category:', error);
      throw error;
    }
  },

  async createCategoryLinkWithHistory(ownerUserId: string, ownerEmail: string, categoryValue: string, linkedUserId: string, linkedEmail: string, actualEmail: string) {
    try {
      // Check if link already exists
      const categoryLinksRef = collection(db, 'categoryLinks');
      const existingLinkQuery = query(
        categoryLinksRef,
        where('ownerUserId', '==', ownerUserId),
        where('linkedUserId', '==', linkedUserId),
        where('categoryValue', '==', categoryValue)
      );
      const existingLinkSnapshot = await getDocs(existingLinkQuery);
      
      if (!existingLinkSnapshot.empty) {
        throw new Error(`Category "${categoryValue}" is already linked with this user`);
      }
      
      // Create the category link
      const linkData = {
        categoryValue,
        ownerUserId,
        ownerEmail,
        linkedUserId,
        linkedEmail: actualEmail,
        createdAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(categoryLinksRef, linkData);
      console.log('UserLinkingService: Category link created with ID:', docRef.id);
      
      // Share all historical transactions for this category
      await this.shareHistoricalTransactions(ownerUserId, ownerEmail, linkedUserId, categoryValue);
      
      // Send notification to linked user
      await notificationService.addNotification(linkedUserId, {
        type: 'category_link',
        title: 'Category Linked',
        message: `${ownerEmail} has linked the category "${categoryValue}" with you. You'll now receive their transactions in this category, including past transactions.`,
        data: { categoryValue, ownerEmail },
      });
      
      console.log('UserLinkingService: Category linked successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('UserLinkingService: Error creating category link:', error);
      throw error;
    }
  },

  async shareHistoricalTransactions(ownerUserId: string, ownerEmail: string, linkedUserId: string, categoryValue: string) {
    try {
      console.log('UserLinkingService: Sharing historical transactions for category:', categoryValue);
      
      // Get all transactions from the owner that include this category
      const ownerTransactionsRef = collection(db, 'users', ownerUserId, 'transactions');
      const snapshot = await getDocs(ownerTransactionsRef);
      
      const relevantTransactions = [];
      snapshot.forEach((doc) => {
        const transaction = { id: doc.id, ...doc.data() };
        const categories = transaction.category.split(',').map((c: string) => c.trim());
        
        if (categories.includes(categoryValue)) {
          relevantTransactions.push(transaction);
        }
      });
      
      console.log('UserLinkingService: Found', relevantTransactions.length, 'historical transactions to share');
      
      // Add each relevant transaction to the linked user's account
      let sharedCount = 0;
      for (const transaction of relevantTransactions) {
        try {
          await firestoreService.addTransaction(linkedUserId, {
            ...transaction,
            description: `${transaction.description} (shared from ${ownerEmail})`,
            id: undefined, // Remove the original ID so a new one is generated
          });
          sharedCount++;
        } catch (error) {
          console.error('UserLinkingService: Error sharing transaction:', transaction.id, error);
        }
      }
      
      console.log('UserLinkingService: Successfully shared', sharedCount, 'historical transactions');
      
      // Send summary notification if any transactions were shared
      if (sharedCount > 0) {
        await notificationService.addNotification(linkedUserId, {
          type: 'shared_transaction',
          title: 'Historical Transactions Shared',
          message: `${ownerEmail} has shared ${sharedCount} past transactions from the "${categoryValue}" category with you.`,
          data: { 
            categoryValue, 
            ownerEmail, 
            count: sharedCount,
            type: 'historical'
          },
        });
      }
    } catch (error) {
      console.error('UserLinkingService: Error sharing historical transactions:', error);
    }
  },

  async createCategoryLink(ownerUserId: string, ownerEmail: string, categoryValue: string, linkedUserId: string, linkedEmail: string, actualEmail: string) {
    return this.createCategoryLinkWithHistory(ownerUserId, ownerEmail, categoryValue, linkedUserId, linkedEmail, actualEmail);
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
      console.log('UserLinkingService: Sharing new transaction with linked users');
      
      const categories = transaction.category.split(',').map((c: string) => c.trim());
      
      for (const categoryValue of categories) {
        // Find users linked to this category
        const categoryLinksRef = collection(db, 'categoryLinks');
        const q = query(categoryLinksRef, 
          where('ownerUserId', '==', ownerUserId),
          where('categoryValue', '==', categoryValue)
        );
        const snapshot = await getDocs(q);
        
        console.log('UserLinkingService: Found', snapshot.size, 'linked users for category:', categoryValue);
        
        snapshot.forEach(async (linkDoc) => {
          const link = linkDoc.data() as CategoryLink;
          
          // Add transaction to linked user's account
          await firestoreService.addTransaction(link.linkedUserId, {
            ...transaction,
            description: `${transaction.description} (shared from ${ownerEmail})`,
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
