import React, { useEffect, useRef } from 'react';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import type { Profile } from '@/types/profile';
import { Loader2, Volume2, Mic } from 'lucide-react';
import dragonLogo from '@/assets/it-logo.jpg';

interface AIChatbotProps {
    detectedProfile: Profile | null;
    allProfiles: Profile[];
}

export function AIChatbot({ detectedProfile, allProfiles }: AIChatbotProps) {
    const { messages, status, error } = useVoiceAssistant(detectedProfile, allProfiles);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, status]);

    const getStatusText = () => {
        switch (status) {
            case 'idle': return 'Listening for wake word...';
            case 'listening': return 'Listening...';
            case 'thinking': return 'Thinking...';
            case 'speaking': return 'Speaking...';
            default: return 'Ready';
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'idle': return 'bg-muted-foreground/30';
            case 'listening': return 'bg-yellow-500';
            case 'thinking': return 'bg-blue-500';
            case 'speaking': return 'bg-green-500';
            default: return 'bg-muted-foreground/30';
        }
    };

    const getStatusPingColor = () => {
        switch (status) {
            case 'listening': return 'bg-yellow-400';
            case 'speaking': return 'bg-green-400';
            default: return 'bg-primary';
        }
    };

    return (
        <div className="mt-4 flex flex-col rounded-xl border border-border/40 bg-card shadow-sm h-[400px]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/40 bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-3">
                    <img src={dragonLogo} alt="Logo" className="h-8 w-8 rounded-full border border-border object-cover" />
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Nova AI Assistant</h3>
                        <p className="text-xs text-muted-foreground">Voice-Activated</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground hidden sm:inline-block">
                        {getStatusText()}
                    </span>
                    <div className="flex h-2 w-2 relative">
                        {status !== 'idle' && status !== 'thinking' ? (
                            <span className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getStatusPingColor()}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${getStatusColor()}`}></span>
                            </span>
                        ) : (
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${getStatusColor()}`}></span>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center opacity-70 fade-in-0 duration-500">
                        <Mic className="h-10 w-10 mb-4 text-muted-foreground/50" />
                        <p className="text-sm font-medium text-foreground">Assistant is active.</p>
                        <p className="text-xs text-muted-foreground mt-1">Say <b>"Hey Nova"</b> to start.</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                    : 'bg-muted text-foreground border border-border/50 rounded-tl-sm'
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))
                )}

                {/* Inline Status Indicators */}
                {status === 'thinking' && (
                    <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2 text-sm border border-border/50 rounded-tl-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                        </div>
                    </div>
                )}
                {status === 'speaking' && (
                    <div className="flex justify-start">
                        <div className="text-xs text-muted-foreground flex items-center gap-1 animate-pulse ml-2">
                            <Volume2 className="h-3 w-3" /> Speaking...
                        </div>
                    </div>
                )}
            </div>

            {/* Controls / Status Bar */}
            <div className={`border-t border-border/40 p-3 bg-muted/10 flex items-center justify-center transition-colors duration-300 ${status === 'listening' ? 'bg-yellow-500/10' : status === 'speaking' ? 'bg-green-500/10' : ''}`}>
                {error ? (
                    <span className="text-xs text-destructive">{error}</span>
                ) : (
                    <div className="flex items-center gap-2">
                        {status === 'listening' ? <Mic className="h-4 w-4 text-yellow-500 animate-pulse" /> : null}
                        <span className={`text-sm font-medium ${status === 'listening' ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                            {getStatusText()}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
