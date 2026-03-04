/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Profile } from '@/types/profile';
import { toast } from 'sonner';

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
    const [isActive, setIsActive] = useState<boolean>(false); // Tracks if chatbot UI is awake

    // Track continuous listening
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const isListeningRef = useRef(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Profile-based greeting tracking
    const hasGreetedProfileRef = useRef<string | null>(null);

    // Initialize Speech Recognition & Synthesis
    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true; // Use continuous to listen safely in background
                recognitionRef.current.interimResults = false;
                recognitionRef.current.lang = 'en-US';

                recognitionRef.current.onstart = () => {
                    isListeningRef.current = true;
                    // Only show 'listening' if we actually pressed the button, otherwise we might be silently waiting for wake word
                    // We will manage status manually below
                };

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript.trim();
                    handleSpeechResult(transcript);
                };

                recognitionRef.current.onerror = (event: any) => {
                    if (event.error !== 'no-speech' && event.error !== 'aborted') {
                        console.error('Speech recognition error:', event.error);
                    }
                    isListeningRef.current = false;
                    if (status === 'listening') {
                        setStatus('idle');
                    }
                };

                recognitionRef.current.onend = () => {
                    isListeningRef.current = false;
                    // If we manually started listening for a single query and it ended, try to restart background listening
                    if (status === 'listening') {
                        setStatus('idle');
                    }
                    if (status !== 'speaking' && status !== 'thinking') {
                        try {
                            recognitionRef.current.start();
                        } catch (e) {
                            // Ignore normal fails
                        }
                    }
                };
            } else {
                setError('Speech recognition not supported in this browser.');
            }
        }

        // Try to start listening immediately on component load if supported
        const timer = setTimeout(() => {
            if (recognitionRef.current && !isListeningRef.current) {
                try { recognitionRef.current.start(); } catch (e) { console.warn(e) }
            }
        }, 1500);

        return () => {
            clearTimeout(timer);
            stopSpeaking();
            if (recognitionRef.current && isListeningRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const stopSpeaking = () => {
        if (synthRef.current && synthRef.current.speaking) {
            synthRef.current.cancel();
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        if (status === 'speaking') {
            setStatus('idle');
        }
    };

    const speakResponse = useCallback((originalText: string, isAutoGreeting: boolean = false) => {
        stopSpeaking();
        const textLower = originalText.toLowerCase();

        // 1. Map of known custom voice recordings based on keywords
        const voiceMap: Record<string, string> = {
            'aruna': '/voices/aruna_mam.ogg',
            'chairman': '/voices/chairman.ogg',
            'gopi': '/voices/gopi_sir.ogg',
            'kishore': '/voices/kishore.ogg',
            'mohanadevi': '/voices/mohanadevi_mam.ogg',
            'muthumanickam': '/voices/muthumanickam_sir.ogg',
            'nandhini': '/voices/nandhini_mam.ogg',
            'palanikumar': '/voices/palanikumar_sir.ogg',
            'parthiban': '/voices/parthiban_sir.ogg',
            'preetha': '/voices/preetha_mam_dean.ogg',
            'preethi': '/voices/preethi_mam.ogg',
            'reena': '/voices/reena_mam.ogg',
            'sathish': '/voices/sathish_sir.ogg',
            'sathya': '/voices/sathya_mam.ogg',
            'surya': '/voices/surya_prasath.ogg',
            'viswanathan': '/voices/viswanathan_sir.ogg',
        };

        let customAudioUrl = null;

        // Determine if the LLM's text contains one of our staff profiles which has an audio file
        // Note: For a more complex AI, you might prompt the LLM to output a JSON keyword, 
        // but for now we regex map the exact text that comes back.
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
                setStatus('idle');
            };
            audio.onerror = () => {
                setStatus('idle');
            };
            audio.play().catch(e => {
                console.error('Audio play failed:', e);
                setStatus('idle');
            });
            return;
        }

        // If it was an auto-greeting but no custom voice is mapped, NEVER fallback to the AI robot voice.
        if (isAutoGreeting) {
            setStatus('idle');
            return;
        }

        // 2. Fallback to default Speech Synthesis if no matching custom static .ogg file is found and it is not an auto greeting
        if (!synthRef.current) {
            setStatus('idle');
            return;
        }

        const utterance = new SpeechSynthesisUtterance(originalText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        setStatus('speaking');

        utterance.onend = () => {
            setStatus('idle');
        };

        utterance.onerror = () => {
            setStatus('idle');
        };

        synthRef.current.speak(utterance);
    }, []);

    // Profile auto-greeting restored to speak the greeting when face is detected
    useEffect(() => {
        if (detectedProfile) {
            // Don't greet if we already greeted this exact person this session
            if (hasGreetedProfileRef.current !== detectedProfile.id) {
                hasGreetedProfileRef.current = detectedProfile.id;

                let greeting = '';
                const lowerName = detectedProfile.name.toLowerCase();

                if (lowerName.includes('aruna')) {
                    greeting = `Hello Professor Aruna. How can I assist you today?`;
                } else if (lowerName.includes('chairman')) {
                    greeting = `Greetings Chairman. Welcome to the IT Department.`;
                } else if (lowerName.includes('gopi')) {
                    greeting = `Hello Professor Gopi. How can I assist you today?`;
                } else if (lowerName.includes('kishore')) {
                    greeting = `Hello Kishore. Welcome to the IT Department!`;
                } else if (lowerName.includes('mohanadevi')) {
                    greeting = `Hello Professor Mohanadevi. How can I assist you today?`;
                } else if (lowerName.includes('muthumanickam')) {
                    greeting = `Hello Professor Muthumanickam. How can I assist you today?`;
                } else if (lowerName.includes('nandhini')) {
                    greeting = `Hello Professor Nandhini. How can I assist you today?`;
                } else if (lowerName.includes('palanikumar')) {
                    greeting = `Hello Professor Palanikumar. How can I assist you today?`;
                } else if (lowerName.includes('parthiban')) {
                    greeting = `Hello Professor Parthiban. How can I assist you today?`;
                } else if (lowerName.includes('preetha')) {
                    greeting = `Hello Dean Preetha. How can I assist you today?`;
                } else if (lowerName.includes('preethi')) {
                    greeting = `Hello Professor Preethi. How can I assist you today?`;
                } else if (lowerName.includes('reena')) {
                    greeting = `Hello Professor Reena. How can I assist you today?`;
                } else if (lowerName.includes('sathish')) {
                    greeting = `Hello Professor Sathish. How can I assist you today?`;
                } else if (lowerName.includes('sathya')) {
                    greeting = `Hello Professor Sathya. How can I assist you today?`;
                } else if (lowerName.includes('surya')) {
                    greeting = `Hello Surya. Welcome to the IT Department!`;
                } else if (lowerName.includes('viswanathan')) {
                    greeting = `Hello Professor Viswanathan. How can I assist you today?`;
                } else if (detectedProfile.role_type === 'staff') {
                    greeting = `Hello Professor ${detectedProfile.name.split(' ')[0]}. How can I assist you today?`;
                } else {
                    greeting = `Hello ${detectedProfile.name.split(' ')[0]}. How can I assist you today?`;
                }

                // We purposefully DO NOT add this to setMessages, so the text chat 
                // remains empty/unstarted until the user manually invokes the dragon button!

                // true flag added -> it will ONLY play custom .ogg. No robot AI voice!
                speakResponse(greeting, true);
            }
        }
    }, [detectedProfile, speakResponse]);

    const sendToLLM = async (userText: string) => {
        setStatus('thinking');

        try {
            // Use Gemini API directly
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) {
                toast.error('Gemini API Key missing', {
                    description: 'Please add VITE_GEMINI_API_KEY to your .env file'
                });
                const fallbackMsg = "I am unable to process your request because my AI key is missing.";
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: fallbackMsg }]);
                speakResponse(fallbackMsg);
                return;
            }

            // Build context from dataset
            const datasetContext = allProfiles.length > 0
                ? "Staff Dataset:\n" + allProfiles.map(p => `${p.name} - ${p.designation || 'Staff'} - ${p.qualification || ''} (${p.role_type})`).join('\n')
                : "Staff Dataset: Not available.";

            // Format previous conversation history for context
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

            // Add recent messages to retain context (last 6 messages)
            const recentMessages = messages.slice(-6);
            recentMessages.forEach(msg => {
                contents.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            });

            // Add the new user prompt
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
                // Clean up Markdown asterisks if any from Gemini
                const cleanText = aiText.replace(/\\*/g, '');
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: cleanText }]);
                speakResponse(cleanText);
            }

        } catch (err: any) {
            console.error('LLM Error:', err);
            toast.error('AI Error', { description: err.message });
            setStatus('idle');
        }
    };


    const handleSpeechResult = (transcript: string) => {
        const textStr = transcript.trim();
        const lowerTranscript = textStr.toLowerCase();

        if (!isActive) {
            // We are OFF and just continuously searching for wake word
            if (lowerTranscript.includes('hey nova')) {
                setIsActive(true);
                const query = lowerTranscript.replace(/hey nova/g, '').trim();
                if (query.length > 0) {
                    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: query }]);
                    sendToLLM(query);
                } else {
                    const greeting = "Hi there, I am Nova. What can I do for you today?";
                    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: greeting }]);
                    speakResponse(greeting);
                }
            }
        } else {
            // We are actively ON checking requests 
            if (textStr.length > 0) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: textStr }]);
                sendToLLM(textStr);
            } else {
                setStatus('idle');
            }
        }
    };

    const startListening = () => {
        if (!isActive) {
            setIsActive(true);
        }
        if (recognitionRef.current) {
            stopSpeaking();
            setStatus('listening');

            if (!isListeningRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (e) {
                    console.error("Speech recognition is already running");
                }
            }
        }
    };

    return {
        messages,
        status,
        startListening,
        stopSpeaking,
        error,
        isActive,
        setIsActive
    };
}
