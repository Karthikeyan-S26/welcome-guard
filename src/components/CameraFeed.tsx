import { Camera, Loader2, AlertCircle } from 'lucide-react';

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  modelsLoaded: boolean;
  cameraError: string | null;
}

export function CameraFeed({ videoRef, canvasRef, modelsLoaded, cameraError }: CameraFeedProps) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-panel-dark">
      {/* Camera border frame */}
      <div className="absolute inset-2 z-10 rounded-xl border-2 border-primary/30 pointer-events-none" />

      {/* Loading state */}
      {!modelsLoaded && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-panel-dark">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm font-medium text-panel-dark-foreground">Loading AI models...</p>
        </div>
      )}

      {/* Error state */}
      {cameraError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-panel-dark">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-sm font-medium text-destructive">{cameraError}</p>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Detection overlay canvas */}
      <canvas
        ref={canvasRef}
        className="absolute left-0 top-0 h-full w-full"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* HUD overlay elements */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-full bg-panel-dark/80 px-3 py-1.5 backdrop-blur-sm">
        <Camera className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-panel-dark-foreground">
          {modelsLoaded ? 'LIVE' : 'LOADING'}
        </span>
        {modelsLoaded && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
      </div>
    </div>
  );
}
