import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, Bell, Landmark, Home, MapPin } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NotificationPanel } from './NotificationPanel';
import { notificationService, Notification } from '@/services/notificationService';
import { webNotificationService } from '@/services/webNotificationService';
import { toast } from '@/components/ui/sonner';

const AuthHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const prevNotificationIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  // Request notification permission on first load
  useEffect(() => {
    if (!user) return;
    
    if (webNotificationService.isSupported() && !webNotificationService.hasAskedPermission()) {
      // Small delay so UI loads first
      const timer = setTimeout(() => {
        webNotificationService.requestPermission().then((perm) => {
          if (perm === 'granted') {
            toast.success('Notifications enabled! You\'ll get alerts for new activity.');
          }
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleNewNotifications = useCallback((incoming: Notification[]) => {
    // Detect truly new notifications (not on first load)
    if (!isFirstLoadRef.current) {
      const prevIds = prevNotificationIdsRef.current;
      const newOnes = incoming.filter(n => !n.read && !prevIds.has(n.id));
      
      for (const n of newOnes) {
        webNotificationService.showNotification(n.title, {
          body: n.message,
          tag: n.id, // deduplicate
        });
      }
    }

    isFirstLoadRef.current = false;
    prevNotificationIdsRef.current = new Set(incoming.map(n => n.id));
    setNotifications(incoming);
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = notificationService.subscribeToNotifications(user.uid, handleNewNotifications);
    return unsubscribe;
  }, [user, handleNewNotifications]);

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const sections = [
    { label: 'Dashboard', path: '/', icon: Home },
    { label: 'Loans', path: '/loans', icon: Landmark },
    { label: 'Events', path: '/events', icon: MapPin },
  ];

  const isCurrent = (path: string) =>
    location.pathname === path || (path === '/' && location.pathname === '/index');

  const navItems = (mobile = false) => sections.map(({ label, path, icon: Icon }) => (
    <Button
      key={path}
      variant={isCurrent(path) ? 'default' : 'ghost'}
      size={mobile ? 'sm' : 'default'}
      onClick={() => navigate(path)}
      aria-current={isCurrent(path) ? 'page' : undefined}
      className={mobile
        ? 'h-auto min-h-12 flex-col gap-1 border-2 border-transparent px-2 py-1 text-[10px] sm:text-xs'
        : 'h-12 w-full justify-start gap-3 px-4'}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{label}</span>
    </Button>
  ));

  const notificationButton = (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setShowNotifications(true)}
      className="relative h-10 w-10 shrink-0"
      aria-label="Notifications"
      title="Notifications"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <Badge variant="destructive" className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center p-0 text-[10px]">
          {unreadCount}
        </Badge>
      )}
    </Button>
  );

  const signOutButton = (
    <Button
      variant="outline"
      size="icon"
      onClick={logout}
      className="h-10 w-10 shrink-0"
      aria-label="Sign out"
      title="Sign out"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r-2 border-foreground bg-background px-5 py-6 lg:flex">
        <div className="flex items-center gap-3 border-b-2 border-foreground pb-6">
          <div className="flex h-11 w-11 items-center justify-center border-2 border-foreground bg-primary text-foreground shadow-sm">
            <span className="font-display text-2xl font-bold">₹</span>
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold leading-tight">Money Matters</p>
            <p className="text-xs text-muted-foreground">Your personal ledger</p>
          </div>
        </div>
        <nav aria-label="Main navigation" className="mt-7 flex flex-col gap-2">
          {navItems()}
        </nav>
        <div className="mt-auto border-t-2 border-foreground pt-5">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0 border-2 border-foreground">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
              <AvatarFallback className="bg-secondary font-bold text-secondary-foreground">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user.displayName || 'User'}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {notificationButton}
            <Button variant="outline" onClick={logout} className="h-10 flex-1" aria-label="Sign out">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b-2 border-foreground bg-background px-4 py-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-foreground bg-primary font-display text-xl font-bold shadow-sm">₹</div>
          <span className="truncate font-display text-base font-bold">Money Matters</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {notificationButton}
          <Avatar className="h-10 w-10 border-2 border-foreground">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
            <AvatarFallback className="bg-secondary font-bold text-secondary-foreground">
              {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {signOutButton}
        </div>
      </header>

      <nav aria-label="Main navigation" className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t-2 border-foreground bg-background px-2 pt-2 lg:hidden">
        {navItems(true)}
      </nav>

      <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
};

export default AuthHeader;
