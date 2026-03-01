import { Link, useLocation } from 'react-router-dom';
import { Settings, Monitor, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import itLogo from '@/assets/it-logo.jpg';

export function DashboardHeader() {
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast.success('Signed out');
  };

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <img src={itLogo} alt="IT Department" className="h-10 w-10 rounded-lg object-cover shadow-md" />
        <div>
          <h1 className="text-lg font-bold leading-tight text-foreground">
            IT Department
          </h1>
          <p className="text-xs text-muted-foreground">AI Face Recognition System</p>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        <Link
          to="/"
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            location.pathname === '/'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Monitor className="h-4 w-4" />
          Dashboard
        </Link>
        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              location.pathname === '/admin'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Settings className="h-4 w-4" />
            Admin
          </Link>
        )}
        {user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="ml-2 gap-2 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        )}
      </nav>
    </header>
  );
}
