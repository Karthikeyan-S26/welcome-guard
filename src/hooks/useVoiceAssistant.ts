/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Profile } from '@/types/profile';
import { toast } from 'sonner';
import dynamicVoiceMap from '@/voiceMap.json';

export type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
};

export type AssistantStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

const SYSTEM_PROMPT = `You are Nova, the official AI assistant for the Information Technology Department.
You have knowledge of the department staff dataset.
Use the provided dataset to answer questions about staff members, their designation, role, and qualification.
Answer clearly and professionally.
If the user asks about a staff member's designation, return the correct designation.
If information is not available in the dataset, respond politely that the information is not available.`;

export function useVoiceAssistant(detectedProfile: Profile | null, allProfiles: Profile[] = []) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [status, setStatus] = useState<AssistantStatus>('idle');

    // Ref to hold the latest state values for access inside event handlers without redeclaring them
    const statusRef = useRef<AssistantStatus>('idle');
    const detectedProfileRef = useRef<Profile | null>(null);
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { detectedProfileRef.current = detectedProfile; }, [detectedProfile]);

    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [error, setError] = useState<string | null>(null);
    const listeningTimeoutRef = useRef<number | null>(null);
    const retryTimeoutRef = useRef<number | null>(null);

    const stopSpeaking = () => {
        if (synthRef.current && synthRef.current.speaking) {
            synthRef.current.cancel();
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        if (statusRef.current === 'speaking') {
            setStatus('idle');
        }
    };

    const speakResponse = useCallback((originalText: string, keepListening: boolean = false) => {
        stopSpeaking();
        const textLower = originalText.toLowerCase();

        const voiceMap: Record<string, string> = dynamicVoiceMap;

        let customAudioUrl = null;
        for (const [key, path] of Object.entries(voiceMap)) {
            if (textLower.includes(key)) {
                customAudioUrl = path;
                break;
            }
        }

        if (customAudioUrl) {
            const audio = new window.Audio(customAudioUrl);
            audioRef.current = audio;
            setStatus('speaking');
            audio.onended = () => {
                setStatus(keepListening ? 'listening' : 'idle');
                if (keepListening) resetListeningTimeout();
            };
            audio.onerror = () => {
                setStatus(keepListening ? 'listening' : 'idle');
            };
            audio.play().catch(e => {
                console.error('Audio play failed:', e);
                setStatus(keepListening ? 'listening' : 'idle');
            });
            return;
        }

        if (!synthRef.current) {
            setStatus(keepListening ? 'listening' : 'idle');
            return;
        }

        const utterance = new SpeechSynthesisUtterance(originalText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(v => v.lang.includes('en-US') || v.lang.includes('en-GB') || v.name.includes('Google'));
        if (preferredVoice) utterance.voice = preferredVoice;

        setStatus('speaking');

        utterance.onend = () => {
            setStatus(keepListening ? 'listening' : 'idle');
            if (keepListening) {
                resetListeningTimeout();
            }
        };

        utterance.onerror = () => {
            setStatus(keepListening ? 'listening' : 'idle');
        };

        synthRef.current.speak(utterance);
    }, []);

    const resetListeningTimeout = () => {
        if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
        listeningTimeoutRef.current = window.setTimeout(() => {
            if (statusRef.current === 'listening') {
                setStatus('idle');
            }
        }, 8000);
    };

    const processCommand = (query: string) => {
        if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: query }]);
        sendToLLM(query);
    }

    const handleSpeechResult = (transcript: string) => {
        const textStr = transcript.trim();
        if (!textStr) return;

        const lowerTranscript = textStr.toLowerCase();
        const currentStatus = statusRef.current;

        // Ignore noise when AI is talking or thinking
        if (currentStatus === 'thinking' || currentStatus === 'speaking') {
            return;
        }

        if (currentStatus === 'idle') {
            // Looking for wake word
            const wakeWordMatch = lowerTranscript.match(/hey nova(.*)/);
            if (wakeWordMatch) {
                const query = wakeWordMatch[1].trim();

                if (query.length > 0) {
                    // Activate and immediately process the query
                    processCommand(query);
                } else {
                    // Activate and greet
                    setStatus('thinking');
                    const activeProfile = detectedProfileRef.current;
                    let name = '';
                    if (activeProfile) {
                        if (activeProfile.role_type === 'staff') {
                            name = `Professor ${activeProfile.name}`;
                        } else {
                            name = activeProfile.name;
                        }
                    }

                    const greeting = name ? `Hello ${name}. How can I assist you today?` : `Hello. How can I assist you today?`;
                    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: greeting }]);
                    speakResponse(greeting, true); // true to fallback to listening after greeting
                }
            }
        } else if (currentStatus === 'listening') {
            // Already activated, process as command
            processCommand(textStr);
        }
    };

    const sendToLLM = async (userText: string) => {
        setStatus('thinking');

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                toast.error('Gemini API Key missing', {
                    description: 'Please add VITE_GEMINI_API_KEY to your .env file'
                });
                const fallbackMsg = "I am unable to process your request because my AI key is missing.";
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: fallbackMsg }]);
                speakResponse(fallbackMsg, false);
                return;
            }

            const datasetContext = allProfiles.length > 0
                ? "Staff Dataset:\n" + allProfiles.map(p => `${p.name} - ${p.designation || 'Staff'} - ${p.qualification || ''} (${p.role_type})`).join('\n')
                : "Staff Dataset: Not available.";

            const contents = [
                {
                    role: "user",
                    parts: [{ text: `${SYSTEM_PROMPT}\n\nContext:\n${datasetContext}` }]
                },
                {
                    role: "model",
                    parts: [{ text: "Understood. I have loaded the dataset and am ready to answer questions." }]
                }
            ];

            const recentMessages = messages.slice(-6);
            recentMessages.forEach(msg => {
                contents.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            });

            contents.push({
                role: "user",
                parts: [{ text: userText }]
            });

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ contents })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || 'Failed to fetch LLM response');
            }

            const data = await response.json();
            const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (aiText) {
                const cleanText = aiText.replace(/\*/g, '');
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: cleanText }]);
                speakResponse(cleanText, false);
            } else {
                setStatus('idle');
            }

        } catch (err: any) {
            console.error('LLM Error:', err);
            toast.error('AI Error', { description: err.message });
            setStatus('idle');
        }
    };

    const attemptRestartRecognition = () => {
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = window.setTimeout(() => {
            if (recognitionRef.current && statusRef.current !== 'speaking' && statusRef.current !== 'thinking') {
                try {
                    recognitionRef.current.start();
                } catch (e) {
                    // Ignore, it might already be running
                }
            }
        }, 1000);
    };

    // Initialize Speech Recognition & Synthesis
    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = false;
                // Important to use interimResults false so we only get final phrases
                recognitionRef.current.lang = 'en-US';

                recognitionRef.current.onstart = () => {
                    // recognition started
                };

                recognitionRef.current.onresult = (event: any) => {
                    // We only process the latest final result
                    const lastResultIndex = event.results.length - 1;
                    const transcript = event.results[lastResultIndex][0].transcript;
                    handleSpeechResult(transcript);
                };

                recognitionRef.current.onerror = (event: any) => {
                    if (event.error !== 'no-speech' && event.error !== 'aborted') {
                        console.error('Speech recognition error:', event.error);
                    }
                    attemptRestartRecognition();
                };

                recognitionRef.current.onend = () => {
                    attemptRestartRecognition();
                };
            } else {
                setError('Speech recognition not supported in this browser.');
            }
        }

        const startTimer = setTimeout(() => {
            if (recognitionRef.current) {
                try { recognitionRef.current.start(); } catch (e) { console.warn(e) }
            }
        }, 1500);

        return () => {
            clearTimeout(startTimer);
            if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current);
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            stopSpeaking();
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                try { recognitionRef.current.stop(); } catch (e) { }
            }
        };
    }, []);

    useEffect(() => {
        if (status === 'idle' || status === 'listening') {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (e) {
                    // Already running
                }
            }
        }
    }, [status]);

    return {
        messages,
        status,
        error
    };
}
