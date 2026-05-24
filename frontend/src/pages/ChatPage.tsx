import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Sparkles, User, Volume2, VolumeX, StopCircle } from 'lucide-react';
import api from '../api';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
}

// ── Browser API availability ──────────────────────────────────────────────────
const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const voiceInputSupported  = !!SpeechRecognitionAPI;
const voiceOutputSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export default function ChatPage() {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [isTyping, setIsTyping]   = useState(false);
  const messagesEndRef            = useRef<HTMLDivElement>(null);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  // Voice input
  const [listening, setListening]     = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef                = useRef<any>(null);

  // Voice output (text-to-speech)
  const [speaking, setSpeaking]             = useState(false);
  const [voiceOutputOn, setVoiceOutputOn]   = useState(false);
  const utteranceRef                        = useRef<SpeechSynthesisUtterance | null>(null);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Load chat history ───────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/chat/history').then(({ data }) => {
      if (data.length === 0) {
        setMessages([{ id: 'welcome', sender: 'assistant',
          text: 'Hello! I am SmartAssist, your personal AI. Ask me anything — or click the 🎙️ mic to speak!' }]);
      } else {
        setMessages(data.map((m: any) => ({
          id: m.id,
          sender: m.role === 'USER' ? 'user' : 'assistant',
          text: m.content,
        })));
      }
    }).catch(() => {
      setMessages([{ id: 'welcome', sender: 'assistant',
        text: 'Hello! I am SmartAssist, your personal AI. Ask me anything — or click the 🎙️ mic to speak!' }]);
    });
  }, []);

  // ── Stop everything on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => { stopListening(); stopSpeaking(); };
  }, []);

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText) return;

    stopListening();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '44px';

    const userMessage: Message = { id: crypto.randomUUID(), sender: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const { data } = await api.post('/chat/message', { content: messageText });
      const reply = data.response || 'No response received';
      const assistantMessage: Message = {
        id: data.message?.id ?? crypto.randomUUID(),
        sender: 'assistant',
        text: reply,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Speak the reply if voice output is enabled
      if (voiceOutputOn) speakText(reply);
    } catch {
      const errMsg = 'Sorry, I am having trouble connecting right now.';
      setMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'assistant', text: errMsg }]);
      if (voiceOutputOn) speakText(errMsg);
    } finally {
      setIsTyping(false);
    }
  };

  // ── Voice INPUT ─────────────────────────────────────────────────────────────
  const startListening = () => {
    if (!voiceInputSupported) {
      alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    stopSpeaking(); // stop AI speaking when user wants to talk

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.continuous = false;    // auto-stops after a pause
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) setInput(prev => (prev + ' ' + final).trim());
      setInterimText(interim);
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed')
        alert('Microphone access denied. Please allow microphone permissions and try again.');
      stopListening();
    };

    recognition.onend = () => {
      // Auto-send when speech finishes (if there's something in input)
      setListening(false);
      setInterimText('');
      recognitionRef.current = null;
      // small delay so state updates before reading input
      setTimeout(() => {
        setInput(prev => {
          if (prev.trim()) handleSend(prev.trim());
          return '';
        });
      }, 300);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setInterimText('');
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setListening(false);
    setInterimText('');
  };

  // ── Voice OUTPUT (TTS) ──────────────────────────────────────────────────────
  const speakText = (text: string) => {
    if (!voiceOutputSupported) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang  = 'en-US';
    utterance.rate  = 1.0;
    utterance.pitch = 1.0;

    // Pick a natural-sounding voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Neural')
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend   = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (voiceOutputSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const toggleVoiceOutput = () => {
    if (voiceOutputOn) stopSpeaking();
    setVoiceOutputOn(v => !v);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="h-14 border-b border-border bg-surface/30 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
          <span className="text-sm font-medium text-text-muted">SmartAssist Online</span>
        </div>

        {/* Voice output toggle */}
        {voiceOutputSupported && (
          <button onClick={toggleVoiceOutput}
            title={voiceOutputOn ? 'Turn off AI voice' : 'Turn on AI voice'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
              voiceOutputOn
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-white/5 border-border text-text-muted hover:text-text'
            }`}>
            {voiceOutputOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {voiceOutputOn ? 'Voice On' : 'Voice Off'}
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((msg) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} max-w-3xl mx-auto w-full`}>
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center mr-3 shrink-0 mt-1">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className={`px-4 py-3 rounded-2xl max-w-[80%] leading-relaxed shadow-sm text-sm whitespace-pre-wrap ${
              msg.sender === 'user'
                ? 'bg-gradient-to-br from-primary to-primary-hover text-white rounded-tr-sm shadow-primary/20'
                : 'bg-surface border border-border text-text rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center ml-3 shrink-0 mt-1">
                <User className="w-4 h-4 text-text-muted" />
              </div>
            )}
          </motion.div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex justify-start max-w-3xl mx-auto w-full">
            <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center mr-3 shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-surface border border-border rounded-tl-sm flex gap-1.5 items-center">
              {[0, 150, 300].map(d => (
                <div key={d} className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Speaking indicator */}
      <AnimatePresence>
        {speaking && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="mx-auto mb-2 flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary">
            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
            <span>SmartAssist is speaking…</span>
            <button onClick={stopSpeaking} className="ml-1 hover:text-red-400 transition-colors">
              <StopCircle className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listening indicator */}
      <AnimatePresence>
        {listening && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="mx-auto mb-2 flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-xs text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span>{interimText ? `"${interimText}"` : 'Listening… speak now'}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="p-5 shrink-0">
        <div className="max-w-3xl mx-auto relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className={`relative bg-surface border rounded-2xl p-2 flex items-end shadow-xl transition-all ${
            listening ? 'border-red-400/50' : 'border-border group-focus-within:border-primary/50'
          }`}>

            {/* Mic button */}
            <button
              onClick={listening ? stopListening : startListening}
              title={listening ? 'Stop listening' : 'Speak to SmartAssist'}
              disabled={isTyping}
              className={`p-3 rounded-xl transition-all ${
                listening
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40'
                  : 'text-text-muted hover:text-primary hover:bg-primary/10'
              }`}>
              {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <textarea
              ref={textareaRef}
              value={listening ? input + (interimText ? ' ' + interimText : '') : input}
              onChange={(e) => {
                if (!listening) {
                  setInput(e.target.value);
                  e.target.style.height = '44px';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder={listening ? 'Listening…' : 'Ask SmartAssist anything… (or click 🎙️)'}
              className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-2.5 px-2 text-text placeholder:text-text-muted outline-none text-sm"
              style={{ height: '44px' }}
            />

            {/* Send button */}
            <button onClick={() => handleSend()} disabled={!input.trim() || isTyping}
              className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 disabled:opacity-50 disabled:shadow-none transition-all ml-2">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-text-muted mt-3">
          SmartAssist can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
