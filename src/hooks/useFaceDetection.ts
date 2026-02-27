import { useRef, useEffect, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import type { Profile } from '@/types/profile';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';

interface DetectedPerson {
  profile: Profile;
  box: { x: number; y: number; width: number; height: number };
}

export function useFaceDetection(profiles: Profile[]) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detectedPerson, setDetectedPerson] = useState<DetectedPerson | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastDetectedRef = useRef<string | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const labeledDescriptorsRef = useRef<faceapi.LabeledFaceDescriptors[]>([]);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Failed to load face-api models:', err);
      }
    };
    loadModels();
  }, []);

  // Build labeled descriptors from profiles
  useEffect(() => {
    if (!modelsLoaded) return;

    const buildDescriptors = async () => {
      const descriptors: faceapi.LabeledFaceDescriptors[] = [];

      for (const profile of profiles) {
        if (profile.face_descriptor && Array.isArray(profile.face_descriptor)) {
          const desc = new Float32Array(profile.face_descriptor);
          descriptors.push(
            new faceapi.LabeledFaceDescriptors(profile.id, [desc])
          );
        }
      }

      labeledDescriptorsRef.current = descriptors;
    };

    buildDescriptors();
  }, [profiles, modelsLoaded]);

  // Start webcam
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 720, height: 560, facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);
    } catch (err) {
      setCameraError('Camera access denied. Please allow camera permissions.');
      console.error('Camera error:', err);
    }
  }, []);

  // Run detection loop
  useEffect(() => {
    if (!modelsLoaded || !videoRef.current) return;

    startCamera();

    const detect = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resized = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (resized.length > 0 && labeledDescriptorsRef.current.length > 0) {
        const matcher = new faceapi.FaceMatcher(labeledDescriptorsRef.current, 0.6);

        for (const detection of resized) {
          const match = matcher.findBestMatch(detection.descriptor);
          const box = detection.detection.box;

          // Draw green bounding box
          ctx.strokeStyle = 'hsl(142, 71%, 45%)';
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          // Corner accents
          const cornerLen = 20;
          ctx.lineWidth = 4;
          // Top-left
          ctx.beginPath();
          ctx.moveTo(box.x, box.y + cornerLen);
          ctx.lineTo(box.x, box.y);
          ctx.lineTo(box.x + cornerLen, box.y);
          ctx.stroke();
          // Top-right
          ctx.beginPath();
          ctx.moveTo(box.x + box.width - cornerLen, box.y);
          ctx.lineTo(box.x + box.width, box.y);
          ctx.lineTo(box.x + box.width, box.y + cornerLen);
          ctx.stroke();
          // Bottom-left
          ctx.beginPath();
          ctx.moveTo(box.x, box.y + box.height - cornerLen);
          ctx.lineTo(box.x, box.y + box.height);
          ctx.lineTo(box.x + cornerLen, box.y + box.height);
          ctx.stroke();
          // Bottom-right
          ctx.beginPath();
          ctx.moveTo(box.x + box.width - cornerLen, box.y + box.height);
          ctx.lineTo(box.x + box.width, box.y + box.height);
          ctx.lineTo(box.x + box.width, box.y + box.height - cornerLen);
          ctx.stroke();

          if (match.label !== 'unknown') {
            const matchedProfile = profiles.find((p) => p.id === match.label);
            if (matchedProfile) {
              // Draw welcome label (mirrored so it reads correctly after scaleX(-1))
              const labelText = `WELCOME ${matchedProfile.name.toUpperCase()}`;
              ctx.font = 'bold 16px Inter, sans-serif';
              const textWidth = ctx.measureText(labelText).width;
              const labelPadding = 12;
              const labelHeight = 32;
              const totalLabelWidth = textWidth + labelPadding * 2;
              const labelCenterX = box.x + box.width / 2;
              const labelY = box.y - labelHeight - 8;

              // Save, flip horizontally around label center so text reads correctly
              ctx.save();
              ctx.translate(labelCenterX, 0);
              ctx.scale(-1, 1);

              const halfW = totalLabelWidth / 2;
              const lx = -halfW;

              // Rounded rect background
              ctx.fillStyle = 'hsl(142, 71%, 45%)';
              ctx.beginPath();
              const r = 8;
              ctx.moveTo(lx + r, labelY);
              ctx.lineTo(lx + totalLabelWidth - r, labelY);
              ctx.quadraticCurveTo(lx + totalLabelWidth, labelY, lx + totalLabelWidth, labelY + r);
              ctx.lineTo(lx + totalLabelWidth, labelY + labelHeight - r);
              ctx.quadraticCurveTo(lx + totalLabelWidth, labelY + labelHeight, lx + totalLabelWidth - r, labelY + labelHeight);
              ctx.lineTo(lx + r, labelY + labelHeight);
              ctx.quadraticCurveTo(lx, labelY + labelHeight, lx, labelY + labelHeight - r);
              ctx.lineTo(lx, labelY + r);
              ctx.quadraticCurveTo(lx, labelY, lx + r, labelY);
              ctx.closePath();
              ctx.fill();

              // Shadow
              ctx.shadowColor = 'rgba(0,0,0,0.3)';
              ctx.shadowBlur = 8;
              ctx.fill();
              ctx.shadowBlur = 0;

              // Text
              ctx.fillStyle = '#FFFFFF';
              ctx.fillText(labelText, lx + labelPadding, labelY + 22);

              ctx.restore();

              if (lastDetectedRef.current !== matchedProfile.id) {
                lastDetectedRef.current = matchedProfile.id;
                setDetectedPerson({
                  profile: matchedProfile,
                  box: { x: box.x, y: box.y, width: box.width, height: box.height },
                });
              }
            }
          }
        }
      } else if (resized.length > 0) {
        // Draw boxes for unknown faces
        for (const detection of resized) {
          const box = detection.detection.box;
          ctx.strokeStyle = 'hsl(220, 9%, 46%)';
          ctx.lineWidth = 2;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
        }
      }
    };

    detectionIntervalRef.current = window.setInterval(detect, 300);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [modelsLoaded, profiles, startCamera]);

  const clearDetection = useCallback(() => {
    lastDetectedRef.current = null;
    setDetectedPerson(null);
  }, []);

  return {
    videoRef,
    canvasRef,
    modelsLoaded,
    detectedPerson,
    cameraError,
    clearDetection,
  };
}
