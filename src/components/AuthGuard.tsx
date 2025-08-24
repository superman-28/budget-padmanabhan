
import { useAuth } from '@/contexts/AuthContext';
import Login from './Login';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();

  console.log('AuthGuard: Rendering with state:', { hasUser: !!user, loading });

  if (loading) {
    console.log('AuthGuard: Showing loading spinner');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('AuthGuard: No user, showing login');
    return <Login />;
  }

  console.log('AuthGuard: User authenticated, showing children');
  return <>{children}</>;
};

export default AuthGuard;
