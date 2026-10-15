import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthHeader from '@/components/AuthHeader';

interface AppShellProps {
  children: ReactNode;
}

const AppShell = ({ children }: AppShellProps) => {
  const { user } = useAuth();

  if (!user) return <>{children}</>;

  return (
    <>
      <AuthHeader />
      <main className="min-h-screen overflow-x-hidden pb-24 lg:ml-64 lg:pb-0">{children}</main>
    </>
  );
};

export default AppShell;