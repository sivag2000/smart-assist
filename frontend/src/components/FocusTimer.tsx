import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Play, Pause, RotateCcw, ChevronDown, ChevronUp, Coffee } from 'lucide-react';

type Mode = 'work' | 'short' | 'long';

const MODES: Record<Mode, { label: string; seconds: number; color: string; ring: string }> = {
  work:  { label: 'Focus',       seconds: 25 * 60, color: 'text-primary',     ring: 'stroke-primary' },
  short: { label: 'Short Break', seconds:  5 * 60, color: 'text-secondary',   ring: 'stroke-secondary' },
  long:  { label: 'Long Break',  seconds: 15 * 60, color: 'text-yellow-400',  ring: 'stroke-yellow-400' },
};

// ── Web Audio beep (no external files needed) ─────────────────────────────────
function playBeep(frequency = 880, duration = 0.4, volume = 0.3) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function playDone() {
  // Three ascending tones
  playBeep(660, 0.2, 0.3);
  setTimeout(() => playBeep(880, 0.2, 0.3), 220);
  setTimeout(() => playBeep(1100, 0.4, 0.3), 440);
}

// ── SVG ring progress ─────────────────────────────────────────────────────────
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function RingProgress({ progress, ringClass }: { progress: number; ringClass: string }) {
  const offset = CIRCUMFERENCE * (1 - progress);
  return (
    <svg width="88" height="88" className="-rotate-90">
      {/* Track */}
      <circle cx="44" cy="44" r={RADIUS} fill="none" stroke="currentColor"
        strokeWidth="5" className="text-white/5" />
      {/* Progress */}
      <circle cx="44" cy="44" r={RADIUS} fill="none"
        strokeWidth="5" strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        className={`${ringClass} transition-all duration-1000`} />
    </svg>
  );
}

export default function FocusTimer() {
  const [expanded, setExpanded]       = useState(false);
  const [mode, setMode]               = useState<Mode>('work');
  const [timeLeft, setTimeLeft]       = useState(MODES.work.seconds);
  const [running, setRunning]         = useState(false);
  const [sessions, setSessions]       = useState(0);   // completed work sessions
  const intervalRef                   = useRef<ReturnType<typeof setInterval> | null>(null);
  const cfg                           = MODES[mode];

  const total    = cfg.seconds;
  const progress = timeLeft / total;
  const mins     = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs     = String(timeLeft % 60).padStart(2, '0');

  // ── Timer tick ──────────────────────────────────────────────────────────────
  const handleDone = useCallback(() => {
    setRunning(false);
    playDone();

    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification('SmartAssist Timer', {
        body: mode === 'work'
          ? `Focus session done! Time for a break 🎉`
          : `Break over — back to work! 💪`,
        icon: '/favicon.ico',
      });
    }

    // Advance session counter
    if (mode === 'work') {
      setSessions(s => {
        const next = s + 1;
        // After 4 sessions → long break; else short break
        const nextMode: Mode = next % 4 === 0 ? 'long' : 'short';
        setMode(nextMode);
        setTimeLeft(MODES[nextMode].seconds);
        return next;
      });
    } else {
      setMode('work');
      setTimeLeft(MODES.work.seconds);
    }
  }, [mode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current!);
            handleDone();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current!);
    }
    return () => clearInterval(intervalRef.current!);
  }, [running, handleDone]);

  // ── Controls ─────────────────────────────────────────────────────────────────
  const toggleRun = () => {
    // Request notification permission on first start
    if (!running && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setRunning(r => !r);
  };

  const reset = () => {
    setRunning(false);
    setTimeLeft(cfg.seconds);
  };

  const switchMode = (m: Mode) => {
    setRunning(false);
    setMode(m);
    setTimeLeft(MODES[m].seconds);
  };

  // ── Compact display (when collapsed but running) ──────────────────────────
  const compactLabel = running ? `${mins}:${secs}` : 'Focus Timer';

  return (
    <div className="border-t border-border pt-2 mt-1">
      {/* Toggle row */}
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-text hover:bg-white/5 transition-all">
        <Timer className={`w-4 h-4 shrink-0 ${running ? cfg.color + ' animate-pulse' : ''}`} />
        <span className={`flex-1 text-left ${running ? cfg.color : ''}`}>{compactLabel}</span>
        {running && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
            {cfg.label}
          </span>
        )}
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden">

            <div className="px-3 pb-3 space-y-3">
              {/* Mode tabs */}
              <div className="flex gap-1 p-1 bg-background/50 rounded-xl">
                {(Object.keys(MODES) as Mode[]).map(m => (
                  <button key={m} onClick={() => switchMode(m)}
                    className={`flex-1 py-1 text-xs font-medium rounded-lg transition-all ${
                      mode === m
                        ? 'bg-surface text-white shadow'
                        : 'text-text-muted hover:text-text'
                    }`}>
                    {m === 'work' ? 'Focus' : m === 'short' ? 'Short' : 'Long'}
                  </button>
                ))}
              </div>

              {/* Ring + time */}
              <div className="flex flex-col items-center gap-1 py-2">
                <div className="relative flex items-center justify-center">
                  <RingProgress progress={progress} ringClass={cfg.ring} />
                  <div className="absolute flex flex-col items-center">
                    <span className={`text-xl font-bold font-mono ${cfg.color}`}>
                      {mins}:{secs}
                    </span>
                  </div>
                </div>
                <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
              </div>

              {/* Session dots */}
              <div className="flex items-center justify-center gap-1">
                {[0, 1, 2, 3].map(i => (
                  <div key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i < (sessions % 4)
                        ? 'bg-primary'
                        : 'bg-white/10'
                    }`} />
                ))}
                {sessions > 0 && (
                  <span className="text-xs text-text-muted ml-1.5 flex items-center gap-0.5">
                    <Coffee className="w-3 h-3" /> {sessions}
                  </span>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-2">
                <button onClick={reset}
                  className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-white/5 transition-all">
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button onClick={toggleRun}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-lg ${
                    running
                      ? 'bg-white/10 text-text hover:bg-white/15'
                      : 'bg-primary text-white hover:bg-primary-hover shadow-primary/30'
                  }`}>
                  {running
                    ? <><Pause className="w-4 h-4" /> Pause</>
                    : <><Play  className="w-4 h-4" /> Start</>}
                </button>
              </div>

              <p className="text-center text-xs text-text-muted/60">
                4 sessions = 1 long break
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
