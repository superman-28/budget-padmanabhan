import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, Bell, Landmark, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NotificationPanel } from './NotificationPanel';
import { notificationService, Notification } from '@/services/notificationService';

const AuthHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = notificationService.subscribeToNotifications(user.uid, setNotifications);
    return unsubscribe;
  }, [user]);

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <div className="flex items-center justify-between p-3 sm:p-4 border-b gap-2">
        {/* Left: Avatar + Nav */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
            <AvatarFallback className="text-xs sm:text-sm">
              {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>

          {/* Name - hidden on mobile */}
          <div className="hidden sm:block min-w-0">
            <p className="font-medium text-sm truncate">{user.displayName || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1 sm:ml-2 sm:border-l sm:pl-3">
            <Button
              variant={location.pathname === '/' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/')}
              className="h-8 px-2 sm:px-3"
            >
              <Home className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline text-xs">Dashboard</span>
            </Button>
            <Button
              variant={location.pathname === '/loans' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/loans')}
              className="h-8 px-2 sm:px-3"
            >
              <Landmark className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline text-xs">Loans</span>
            </Button>
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotifications(true)}
            className="relative h-8 w-8 p-0 sm:w-auto sm:px-3"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center text-[10px]"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={logout} className="h-8 px-2 sm:px-3">
            <LogOut className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline text-xs">Sign Out</span>
          </Button>
        </div>
      </div>

      <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
};

export default AuthHeader;
