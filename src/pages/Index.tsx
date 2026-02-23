import { useEffect, useRef } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { CameraFeed } from '@/components/CameraFeed';
import { ProfileCard } from '@/components/ProfileCard';
import { WelcomeBanner } from '@/components/WelcomeBanner';
import { useFaceDetection } from '@/hooks/useFaceDetection';
import { useVoiceFeedback } from '@/hooks/useVoiceFeedback';
import { useProfiles } from '@/hooks/useProfiles';

const Index = () => {
  const { data: profiles = [] } = useProfiles();
  const { videoRef, canvasRef, modelsLoaded, detectedPerson, cameraError, clearDetection } =
    useFaceDetection(profiles);
  const { speak, reset: resetVoice } = useVoiceFeedback();
  const hideTimerRef = useRef<number | null>(null);

  // Trigger TTS + auto-clear after 5s
  useEffect(() => {
    if (detectedPerson) {
      speak(detectedPerson.profile.name);

      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => {
        clearDetection();
        resetVoice();
      }, 8000);
    }

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [detectedPerson, speak, clearDetection, resetVoice]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <WelcomeBanner name={detectedPerson?.profile.name ?? null} />
      <DashboardHeader />

      <main className="flex flex-1 gap-4 p-4">
        {/* Left — Camera (60%) */}
        <section className="flex-[3] min-h-[500px]">
          <CameraFeed
            videoRef={videoRef}
            canvasRef={canvasRef}
            modelsLoaded={modelsLoaded}
            cameraError={cameraError}
          />
        </section>

        {/* Right — Profile (40%) */}
        <aside className="flex-[2]">
          <ProfileCard profile={detectedPerson?.profile ?? null} />
        </aside>
      </main>

      {/* Footer stats bar */}
      <footer className="flex items-center justify-between border-t border-border bg-card px-6 py-2 text-xs text-muted-foreground">
        <span>Registered Profiles: {profiles.length}</span>
        <span>Status: {modelsLoaded ? '● AI Active' : '○ Loading...'}</span>
        <span>Detection: Real-time</span>
      </footer>
    </div>
  );
};

export default Index;
