import { useRef, useCallback } from 'react';

export function useVoiceFeedback() {
  const lastSpokenRef = useRef<string | null>(null);
  const speakingRef = useRef(false);

  const speak = useCallback((name: string) => {
    if (lastSpokenRef.current === name || speakingRef.current) return;

    lastSpokenRef.current = name;
    speakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(
      `Welcome to I.T. Department, ${name}`
    );
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      speakingRef.current = false;
    };
    utterance.onerror = () => {
      speakingRef.current = false;
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  const reset = useCallback(() => {
    lastSpokenRef.current = null;
  }, []);

  return { speak, reset };
}
