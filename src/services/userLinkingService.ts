import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where,
  Timestamp,
  updateDoc,
  deleteDoc
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

export interface SharedTransaction {
  id: string;
  originalTransactionId: string;
  sharedTransactionId: string;
  ownerUserId: string;
  linkedUserId: string;
  categoryValue: string;
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
        const transactionData = doc.data();
        const transaction = { id: doc.id, ...transactionData };
        
        // Check if transaction has category property and includes our categoryValue
        if (transactionData.category && typeof transactionData.category === 'string') {
          const categories = transactionData.category.split(',').map((c: string) => c.trim());
          
          if (categories.includes(categoryValue)) {
            relevantTransactions.push(transaction);
          }
        }
      });
      
      console.log('UserLinkingService: Found', relevantTransactions.length, 'historical transactions to share');
      
      // Add each relevant transaction to the linked user's account and track the sharing
      let sharedCount = 0;
      for (const transaction of relevantTransactions) {
        try {
          // Add transaction to linked user
          const sharedTransactionId = await firestoreService.addTransaction(linkedUserId, {
            ...transaction,
            description: `${transaction.description} (shared from ${ownerEmail})`,
            id: undefined, // Remove the original ID so a new one is generated
          });
          
          // Track this shared transaction for future synchronization
          await this.trackSharedTransaction(transaction.id, sharedTransactionId, ownerUserId, linkedUserId, categoryValue);
          
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

  async trackSharedTransaction(originalTransactionId: string, sharedTransactionId: string, ownerUserId: string, linkedUserId: string, categoryValue: string) {
    try {
      const sharedTransactionsRef = collection(db, 'sharedTransactions');
      await addDoc(sharedTransactionsRef, {
        originalTransactionId,
        sharedTransactionId,
        ownerUserId,
        linkedUserId,
        categoryValue,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('UserLinkingService: Error tracking shared transaction:', error);
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

  async getOwnedCategoryLinks(userId: string): Promise<CategoryLink[]> {
    try {
      const categoryLinksRef = collection(db, 'categoryLinks');
      const q = query(categoryLinksRef, where('ownerUserId', '==', userId));
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
      console.error('UserLinkingService: Error getting owned category links:', error);
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
        
        for (const linkDoc of snapshot.docs) {
          const link = linkDoc.data() as CategoryLink;
          
          try {
            // Add transaction to linked user's account
            const sharedTransactionId = await firestoreService.addTransaction(link.linkedUserId, {
              ...transaction,
              description: `${transaction.description} (shared from ${ownerEmail})`,
            });
            
            // Track this shared transaction for future synchronization
            await this.trackSharedTransaction(transaction.id || '', sharedTransactionId, ownerUserId, link.linkedUserId, categoryValue);
            
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
            
            console.log('UserLinkingService: Shared transaction with user:', link.linkedUserId);
          } catch (err) {
            console.error('UserLinkingService: Error sharing with linked user:', link.linkedUserId, err);
          }
        }
      }
    } catch (error) {
      console.error('UserLinkingService: Error sharing transaction:', error);
    }
  },

  async updateSharedTransaction(ownerUserId: string, ownerEmail: string, updatedTransaction: any) {
    try {
      console.log('UserLinkingService: Updating shared transactions for transaction:', updatedTransaction.id);
      
      // Find all shared transactions that originated from this transaction
      const sharedTransactionsRef = collection(db, 'sharedTransactions');
      const q = query(sharedTransactionsRef, 
        where('originalTransactionId', '==', updatedTransaction.id),
        where('ownerUserId', '==', ownerUserId)
      );
      const snapshot = await getDocs(q);
      
      console.log('UserLinkingService: Found', snapshot.size, 'shared transactions to update');
      
      for (const sharedDoc of snapshot.docs) {
        const sharedData = sharedDoc.data() as SharedTransaction;
        
        try {
          await firestoreService.updateTransaction(sharedData.linkedUserId, {
            ...updatedTransaction,
            id: sharedData.sharedTransactionId,
            description: `${updatedTransaction.description} (shared from ${ownerEmail})`,
          });
          
          console.log('UserLinkingService: Updated shared transaction:', sharedData.sharedTransactionId);
        } catch (error) {
          console.error('UserLinkingService: Error updating shared transaction:', sharedData.sharedTransactionId, error);
        }
      }
    } catch (error) {
      console.error('UserLinkingService: Error updating shared transactions:', error);
    }
  },

  async deleteSharedTransaction(ownerUserId: string, transactionId: string) {
    try {
      console.log('UserLinkingService: Deleting shared transactions for transaction:', transactionId);
      
      // Find all shared transactions that originated from this transaction
      const sharedTransactionsRef = collection(db, 'sharedTransactions');
      const q = query(sharedTransactionsRef, 
        where('originalTransactionId', '==', transactionId),
        where('ownerUserId', '==', ownerUserId)
      );
      const snapshot = await getDocs(q);
      
      console.log('UserLinkingService: Found', snapshot.size, 'shared transactions to delete');
      
      for (const sharedDoc of snapshot.docs) {
        const sharedData = sharedDoc.data() as SharedTransaction;
        
        try {
          await firestoreService.deleteTransaction(sharedData.linkedUserId, sharedData.sharedTransactionId);
          await deleteDoc(sharedDoc.ref);
          
          console.log('UserLinkingService: Deleted shared transaction:', sharedData.sharedTransactionId);
        } catch (error) {
          console.error('UserLinkingService: Error deleting shared transaction:', sharedData.sharedTransactionId, error);
        }
      }
    } catch (error) {
      console.error('UserLinkingService: Error deleting shared transactions:', error);
    }
  },

  async unlinkCategoryFromUser(ownerUserId: string, categoryValue: string, linkedUserId: string) {
    try {
      console.log('UserLinkingService: Unlinking category from user:', { ownerUserId, categoryValue, linkedUserId });
      
      // Find and delete the category link
      const categoryLinksRef = collection(db, 'categoryLinks');
      const linkQuery = query(
        categoryLinksRef,
        where('ownerUserId', '==', ownerUserId),
        where('linkedUserId', '==', linkedUserId),
        where('categoryValue', '==', categoryValue)
      );
      const linkSnapshot = await getDocs(linkQuery);
      
      if (linkSnapshot.empty) {
        throw new Error('Category link not found');
      }
      
      const linkDoc = linkSnapshot.docs[0];
      const linkData = linkDoc.data();
      
      // Delete the category link
      await deleteDoc(linkDoc.ref);
      console.log('UserLinkingService: Category link deleted');
      
      // Remove all shared transactions for this category between these users
      await this.removeSharedTransactions(ownerUserId, linkedUserId, categoryValue);
      
      // Send notification to the unlinked user
      await notificationService.addNotification(linkedUserId, {
        type: 'category_unlink',
        title: 'Category Unlinked',
        message: `${linkData.ownerEmail} has unlinked the category "${categoryValue}" from you. You will no longer receive their transactions in this category.`,
        data: { categoryValue, ownerEmail: linkData.ownerEmail },
      });
      
      console.log('UserLinkingService: Category unlinked successfully');
    } catch (error) {
      console.error('UserLinkingService: Error unlinking category:', error);
      throw error;
    }
  },

  async removeSharedTransactions(ownerUserId: string, linkedUserId: string, categoryValue: string) {
    try {
      console.log('UserLinkingService: Removing shared transactions for category:', categoryValue);
      
      // Find all shared transactions for this category between these users
      const sharedTransactionsRef = collection(db, 'sharedTransactions');
      const q = query(sharedTransactionsRef, 
        where('ownerUserId', '==', ownerUserId),
        where('linkedUserId', '==', linkedUserId),
        where('categoryValue', '==', categoryValue)
      );
      const snapshot = await getDocs(q);
      
      console.log('UserLinkingService: Found', snapshot.size, 'shared transactions to remove');
      
      // Remove each shared transaction from the linked user's account and delete tracking record
      let removedCount = 0;
      snapshot.forEach(async (sharedDoc) => {
        const sharedData = sharedDoc.data() as SharedTransaction;
        
        try {
          // Delete the shared transaction from the linked user's account
          await firestoreService.deleteTransaction(linkedUserId, sharedData.sharedTransactionId);
          
          // Delete the tracking record
          await deleteDoc(sharedDoc.ref);
          
          removedCount++;
        } catch (error) {
          console.error('UserLinkingService: Error removing shared transaction:', sharedData.sharedTransactionId, error);
        }
      });
      
      console.log('UserLinkingService: Successfully removed', removedCount, 'shared transactions');
      
      // Send summary notification if any transactions were removed
      if (removedCount > 0) {
        await notificationService.addNotification(linkedUserId, {
          type: 'shared_transaction_removed',
          title: 'Shared Transactions Removed',
          message: `${removedCount} shared transactions from the "${categoryValue}" category have been removed from your account.`,
          data: { 
            categoryValue, 
            count: removedCount,
            type: 'removal'
          },
        });
      }
    } catch (error) {
      console.error('UserLinkingService: Error removing shared transactions:', error);
    }
  },
};
