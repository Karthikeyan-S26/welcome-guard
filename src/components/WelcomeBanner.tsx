import { useEffect, useState } from 'react';

interface WelcomeBannerProps {
  name: string | null;
}

export function WelcomeBanner({ name }: WelcomeBannerProps) {
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (name) {
      setDisplayName(name);
      setVisible(true);
      setHiding(false);

      const timer = setTimeout(() => {
        setHiding(true);
        setTimeout(() => {
          setVisible(false);
          setHiding(false);
        }, 500);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [name]);

  if (!visible || !displayName) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-primary px-6 py-4 shadow-lg ${
        hiding ? 'animate-slide-up' : 'animate-slide-down'
      }`}
    >
      <p className="text-center text-lg font-bold tracking-wide text-primary-foreground drop-shadow-md">
        WELCOME TO IT DEPARTMENT — {displayName.toUpperCase()}
      </p>
    </div>
  );
}
