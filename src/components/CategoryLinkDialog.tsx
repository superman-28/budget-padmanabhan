
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { userLinkingService } from '@/services/userLinkingService';
import { toast } from 'sonner';

interface CategoryLinkDialogProps {
  categoryValue: string;
  categoryLabel: string;
  isOpen: boolean;
  onClose: () => void;
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

  const handleLinkUser = async () => {
    if (!user || !email.trim()) return;

    setLoading(true);
    try {
      await userLinkingService.linkCategoryToUser(
        user.uid,
        user.email!,
        categoryValue,
        email.trim()
      );
      
      toast.success(`Successfully linked category "${categoryLabel}" with ${email}`);
      setEmail('');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to link user');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md surface-elevated">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Link Category
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Link the category <strong>"{categoryLabel}"</strong> with another user. 
              They will receive your transactions in this category and get notified.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="user-email">User Email</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="Enter user's email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleLinkUser} 
              disabled={loading || !email.trim()}
              className="flex-1"
            >
              {loading ? 'Linking...' : 'Link User'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
