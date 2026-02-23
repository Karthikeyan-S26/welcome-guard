import { Link, useLocation } from 'react-router-dom';
import { Shield, Settings, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardHeader() {
  const location = useLocation();

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-md">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
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
      </nav>
    </header>
  );
}
