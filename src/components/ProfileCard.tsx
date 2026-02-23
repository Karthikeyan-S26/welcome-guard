import { Card, CardContent } from '@/components/ui/card';
import { User } from 'lucide-react';
import type { Profile } from '@/types/profile';

interface ProfileCardProps {
  profile: Profile | null;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  if (!profile) {
    return (
      <Card className="flex h-full items-center justify-center border-0 bg-card shadow-xl">
        <CardContent className="flex flex-col items-center gap-4 py-16">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <User className="h-12 w-12 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">Awaiting detection...</p>
          <div className="flex gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary delay-100" style={{ animationDelay: '0.2s' }} />
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary delay-200" style={{ animationDelay: '0.4s' }} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in flex h-full flex-col items-center border-0 bg-card shadow-xl">
      <CardContent className="flex w-full flex-col items-center gap-6 pt-10 pb-8">
        {/* Photo */}
        <div className="relative">
          <div className="h-48 w-48 overflow-hidden rounded-2xl border-4 border-primary/20 shadow-lg">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <User className="h-20 w-20 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-md">
            {profile.role_type === 'staff' ? 'Staff' : 'Student'}
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl font-bold text-foreground">{profile.name}</h2>
          <p className="text-base font-medium text-primary">{profile.designation}</p>
          {profile.qualification && (
            <p className="text-sm text-muted-foreground">{profile.qualification}</p>
          )}
        </div>

        {/* Status badge */}
        <div className="mt-2 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium text-primary">Recognized</span>
        </div>
      </CardContent>
    </Card>
  );
}
