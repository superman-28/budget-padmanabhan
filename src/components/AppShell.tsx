import { useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthHeader from '@/components/AuthHeader';

interface AppShellProps {
  children: ReactNode;
}

const SIDEBAR_STORAGE_KEY = 'finance-tracker-sidebar-collapsed';

const AppShell = ({ children }: AppShellProps) => {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  if (!user) return <>{children}</>;

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Keep the toggle usable when browser storage is unavailable.
      }
      return next;
    });
  };

  return (
    <>
      <AuthHeader collapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />
      <main className={`min-h-screen overflow-x-hidden pb-24 lg:pb-0 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>{children}</main>
    </>
  );
};

export default AppShell;
