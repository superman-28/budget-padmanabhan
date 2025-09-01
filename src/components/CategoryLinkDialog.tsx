
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, UserPlus, User, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { userLinkingService } from '@/services/userLinkingService';
import { toast } from 'sonner';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CategoryLinkDialogProps {
  categoryValue: string;
  categoryLabel: string;
  isOpen: boolean;
  onClose: () => void;
}

interface AvailableUser {
  uid: string;
  email: string;
  displayName: string;
}

export const CategoryLinkDialog = ({ 
  categoryValue, 
  categoryLabel, 
  isOpen, 
  onClose 
}: CategoryLinkDialogProps) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [showUserList, setShowUserList] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [linkedUserIds, setLinkedUserIds] = useState<Set<string>>(new Set());

  // Load available users and linked users when dialog opens
  useEffect(() => {
    if (isOpen && user) {
      loadAvailableUsers();
      loadLinkedUsers();
    }
  }, [isOpen, user, categoryValue]);

  const loadLinkedUsers = async () => {
    if (!user) return;
    
    try {
      const links = await userLinkingService.getOwnedCategoryLinks(user.uid);
      const linkedForThisCategory = links
        .filter(link => link.categoryValue === categoryValue)
        .map(link => link.linkedUserId);
      setLinkedUserIds(new Set(linkedForThisCategory));
    } catch (error) {
      console.error('Error loading linked users:', error);
    }
  };

  const loadAvailableUsers = async () => {
    if (!user) return;
    
    setLoadingUsers(true);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const users: AvailableUser[] = [];
      snapshot.forEach((doc) => {
        const userData = doc.data();
        // Don't include the current user
        if (userData.uid !== user.uid) {
          users.push({
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName || userData.email?.split('@')[0] || 'Unknown User'
          });
        }
      });
      
      setAvailableUsers(users.sort((a, b) => a.displayName.localeCompare(b.displayName)));
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load available users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleLinkUser = async (targetEmail: string) => {
    if (!user || !targetEmail.trim()) return;

    setLoading(true);
    try {
      await userLinkingService.linkCategoryToUser(
        user.uid,
        user.email!,
        categoryValue,
        targetEmail.trim()
      );
      
      toast.success(`Successfully linked category "${categoryLabel}" with ${targetEmail}`);
      setEmail('');
      // Refresh linked users after successful link
      await loadLinkedUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to link user');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (selectedUser: AvailableUser) => {
    // Check if user is already linked
    if (linkedUserIds.has(selectedUser.uid)) {
      toast.info(`${selectedUser.displayName} is already linked to this category`);
      return;
    }
    
    handleLinkUser(selectedUser.email);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md surface-elevated max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Link Category
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4 flex-1 overflow-y-auto">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Link the category <strong>"{categoryLabel}"</strong> with another user. 
              They will receive your transactions in this category and get notified.
            </p>
          </div>

          {showUserList && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Available Users</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUserList(false)}
                  className="text-xs"
                >
                  Use Email Instead
                </Button>
              </div>
              
              {loadingUsers ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading users...</p>
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No other users found</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUserList(false)}
                    className="text-xs mt-2"
                  >
                    Link by Email
                  </Button>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                  {availableUsers.map((availableUser) => {
                    const isLinked = linkedUserIds.has(availableUser.uid);
                    return (
                      <div
                        key={availableUser.uid}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          isLinked 
                            ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleUserSelect(availableUser)}
                      >
                        {isLinked ? (
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${
                            isLinked ? 'text-green-700 dark:text-green-300' : ''
                          }`}>
                            {availableUser.displayName}
                            {isLinked && ' (Linked)'}
                          </p>
                          <p className={`text-xs ${
                            isLinked ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                          }`}>
                            {availableUser.email}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!showUserList && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="user-email">User Email</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUserList(true)}
                  className="text-xs"
                >
                  Select from List
                </Button>
              </div>
              <Input
                id="user-email"
                type="email"
                placeholder="Enter user's email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleLinkUser(email)} 
                  disabled={loading || !email.trim()}
                  className="flex-1"
                >
                  {loading ? 'Linking...' : 'Link User'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
