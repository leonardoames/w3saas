"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface StateIconProps {
  size?: number;
  color?: string;
  className?: string;
  duration?: number;
}

function useAutoToggle(interval: number) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setOn((v) => !v), interval);
    return () => clearInterval(id);
  }, [interval]);
  return on;
}

/* ─── 1. LOADING → SUCCESS ─── spinner morphs into checkmark */
export function SuccessIcon({ size = 40, color = "currentColor", className, duration = 2200 }: StateIconProps) {
  const done = useAutoToggle(duration);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={cn("inline-block", className)}>
      <motion.circle cx="20" cy="20" r="16" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" animate={done ? { pathLength: 1, opacity: 1 } : { pathLength: 0.7, opacity: 0.5 }} transition={{ duration: 0.5 }} />
      {!done && (
        <motion.circle cx="20" cy="20" r="16" stroke={color} strokeWidth="2.5" fill="none" strokeDasharray="30 70" strokeLinecap="round" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ transformOrigin: "center" }} />
      )}
      <motion.path d="M13 20l5 5 9-9" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" animate={done ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }} transition={{ duration: 0.4, delay: done ? 0.2 : 0 }} />
    </svg>
  );
}

/* ─── 2. MENU → CLOSE ─── hamburger morphs to X */
export function MenuCloseIcon({ size = 40, color = "currentColor", className, duration = 2000 }: StateIconProps) {
  const open = useAutoToggle(duration);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={cn("inline-block", className)}>
      <motion.line x1="8" x2="32" stroke={color} strokeWidth="2.5" strokeLinecap="round" animate={open ? { y1: 20, y2: 20, rotate: 45 } : { y1: 12, y2: 12, rotate: 0 }} style={{ transformOrigin: "center" }} transition={{ duration: 0.35 }} />
      <motion.line x1="8" y1="20" x2="32" y2="20" stroke={color} strokeWidth="2.5" strokeLinecap="round" animate={{ opacity: open ? 0 : 1, scaleX: open ? 0 : 1 }} transition={{ duration: 0.2 }} />
      <motion.line x1="8" x2="32" stroke={color} strokeWidth="2.5" strokeLinecap="round" animate={open ? { y1: 20, y2: 20, rotate: -45 } : { y1: 28, y2: 28, rotate: 0 }} style={{ transformOrigin: "center" }} transition={{ duration: 0.35 }} />
    </svg>
  );
}

/* ─── 3. PLAY → PAUSE ─── */
export function PlayPauseIcon({ size = 40, color = "currentColor", className, duration = 2400 }: StateIconProps) {
  const playing = useAutoToggle(duration);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={cn("inline-block", className)}>
      <AnimatePresence mode="wait">
        {playing ? (
          <motion.g key="pause" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.25 }}>
            <rect x="11" y="10" width="6" height="20" rx="1.5" fill={color} />
            <rect x="23" y="10" width="6" height="20" rx="1.5" fill={color} />
          </motion.g>
        ) : (
          <motion.g key="play" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.25 }}>
            <polygon points="14,10 30,20 14,30" fill={color} />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/* ─── 4. LOCK → UNLOCK ─── shackle lifts */
export function LockUnlockIcon({ size = 40, color = "currentColor", className, duration = 2600 }: StateIconProps) {
  const unlocked = useAutoToggle(duration);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={cn("inline-block", className)}>
      <rect x="10" y="18" width="20" height="16" rx="3" stroke={color} strokeWidth="2.5" fill="none" />
      <motion.path d={unlocked ? "M14 18V13a6 6 0 0 1 12 0" : "M14 18V13a6 6 0 0 1 12 0v5"} stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" animate={unlocked ? { y: -3 } : { y: 0 }} transition={{ type: "spring", stiffness: 300 }} />
      <circle cx="20" cy="26" r="2" fill={color} />
    </svg>
  );
}

/* ─── 5. COPY → COPIED ─── clipboard with checkmark flash */
export function CopiedIcon({ size = 40, color = "currentColor", className, duration = 2200 }: StateIconProps) {
  const copied = useAutoToggle(duration);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={cn("inline-block", className)}>
      <rect x="10" y="8" width="20" height="26" rx="3" stroke={color} strokeWidth="2" fill="none" />
      <rect x="15" y="4" width="10" height="6" rx="2" stroke={color} strokeWidth="2" fill="none" />
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.path key="check" d="M14 22l4 4 8-8" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
        ) : (
          <motion.g key="lines" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <line x1="15" y1="18" x2="25" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <line x1="15" y1="23" x2="22" y2="23" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <line x1="15" y1="28" x2="20" y2="28" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/* ─── 6. BELL → NOTIFICATION ─── bell rings then dot appears */
export function NotificationIcon({ size = 40, color = "currentColor", className, duration = 2800 }: StateIconProps) {
  const notif = useAutoToggle(duration);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={cn("inline-block", className)}>
      <motion.path d="M20 6a10 10 0 0 0-10 10v6l-2 4h24l-2-4v-6a10 10 0 0 0-10-10z" stroke={color} strokeWidth="2" fill="none" animate={notif ? { rotate: [0, -8, 8, -4, 4, 0] } : {}} transition={{ duration: 0.5 }} style={{ transformOrigin: "20px 6px" }} />
      <path d="M16 30a4 4 0 0 0 8 0" stroke={color} strokeWidth="2" fill="none" />
      <motion.circle cx="28" cy="10" r="4" fill="hsl(0,70%,50%)" initial={false} animate={{ scale: notif ? 1 : 0, opacity: notif ? 1 : 0 }} transition={{ type: "spring", stiffness: 400 }} />
    </svg>
  );
}

/* ─── 7. HEART → FILLED ─── heart fills with bounce */
export function HeartIcon({ size = 40, color = "currentColor", className, duration = 2000 }: StateIconProps) {
  const filled = useAutoToggle(duration);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={cn("inline-block", className)}>
      <motion.path d="M20 34s-12-7.5-12-16a7.5 7.5 0 0 1 12-6 7.5 7.5 0 0 1 12 6c0 8.5-12 16-12 16z" stroke={color} strokeWidth="2" fill={filled ? color : "none"} animate={filled ? { scale: [1, 1.25, 1] } : { scale: 1 }} transition={{ duration: 0.4 }} style={{ transformOrigin: "center" }} />
    </svg>
  );
}

/* ─── 8. DOWNLOAD → DONE ─── arrow drops into tray then checks */
export function DownloadDoneIcon({ size = 40, color = "currentColor", className, duration = 2400 }: StateIconProps) {
  const done = useAutoToggle(duration);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={cn("inline-block", className)}>
      <path d="M8 30h24" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <AnimatePresence mode="wait">
        {done ? (
          <motion.path key="check" d="M13 20l5 5 9-9" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} />
        ) : (
          <motion.g key="arrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.line x1="20" y1="6" x2="20" y2="24" stroke={color} strokeWidth="2.5" strokeLinecap="round" animate={{ y: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1 }} />
            <motion.polyline points="14,20 20,26 26,20" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" animate={{ y: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1 }} />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/* ─── 9. SEND ─── paper plane flies off then resets */
export function SendIcon({ size = 40, color = "currentColor", className, duration = 2600 }: StateIconProps) {
  const sent = useAutoToggle(duration);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={cn("inline-block", className)}>
      <motion.g animate={sent ? { x: 30, opacity: 0 } : { x: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
        <polygon points="6,20 16,16 34,6 24,24 16,24" stroke={color} strokeWidth="2" fill="none" />
        <line x1="16" y1="24" x2="16" y2="16" stroke={color} strokeWidth="2" />
        <line x1="34" y1="6" x2="16" y2="16" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
      </motion.g>
    </svg>
  );
}

/* ─── 10. TOGGLE ─── switch flips with spring */
export function ToggleIcon({ size = 40, color = "currentColor", className, duration = 1800 }: StateIconProps) {
  const on = useAutoToggle(duration);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={cn("inline-block", className)}>
      <rect x="4" y="12" width="32" height="16" rx="8" stroke={color} strokeWidth="2" fill={on ? color : "none"} />
      <motion.circle cy="20" r="6" fill={on ? "white" : color} animate={{ cx: on ? 28 : 12 }} transition={{ type: "spring", stiffness: 500, damping: 25 }} />
      <motion.rect x="4" y="12" width="32" height="16" rx="8" fill={color} animate={{ opacity: on ? 0.15 : 0 }} />
    </svg>
  );
}

/* ─── 11. EYE → HIDDEN ─── eye opens/closes with slash */
export function EyeToggleIcon({ size = 40, color = "currentColor", className, duration = 2200 }: StateIconProps) {
  const hidden = useAutoToggle(duration);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={cn("inline-block", className)}>
      <path d="M4 20s6-10 16-10 16 10 16 10-6 10-16 10S4 20 4 20z" stroke={color} strokeWidth="2" fill="none" />
      <circle cx="20" cy="20" r="4" stroke={color} strokeWidth="2" fill="none" />
      <motion.line x1="6" y1="34" x2="34" y2="6" stroke={color} strokeWidth="2.5" strokeLinecap="round" animate={{ opacity: hidden ? 1 : 0, pathLength: hidden ? 1 : 0 }} transition={{ duration: 0.3 }} />
    </svg>
  );
}

/* ─── 12. VOLUME ─── mute/unmute with wave fade */
export function VolumeIcon({ size = 40, color = "currentColor", className, duration = 2400 }: StateIconProps) {
  const muted = useAutoToggle(duration);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={cn("inline-block", className)}>
      <polygon points="6,16 12,16 20,8 20,32 12,24 6,24" fill={color} />
      <motion.line x1="28" y1="14" x2="36" y2="26" stroke={color} strokeWidth="2.5" strokeLinecap="round" animate={{ opacity: muted ? 1 : 0 }} transition={{ duration: 0.2 }} />
      <motion.line x1="36" y1="14" x2="28" y2="26" stroke={color} strokeWidth="2.5" strokeLinecap="round" animate={{ opacity: muted ? 1 : 0 }} transition={{ duration: 0.2 }} />
      <motion.g animate={{ opacity: muted ? 0 : 1 }} transition={{ duration: 0.3 }}>
        <path d="M26 14a8 8 0 0 1 0 12" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M30 10a14 14 0 0 1 0 20" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      </motion.g>
    </svg>
  );
}

/* ─── Demo Component ─── */
const ALL_ICONS = [
  { name: "Success", Icon: SuccessIcon },
  { name: "Menu", Icon: MenuCloseIcon },
  { name: "Play/Pause", Icon: PlayPauseIcon },
  { name: "Lock", Icon: LockUnlockIcon },
  { name: "Copied", Icon: CopiedIcon },
  { name: "Notification", Icon: NotificationIcon },
  { name: "Heart", Icon: HeartIcon },
  { name: "Download", Icon: DownloadDoneIcon },
  { name: "Send", Icon: SendIcon },
  { name: "Toggle", Icon: ToggleIcon },
  { name: "Eye", Icon: EyeToggleIcon },
  { name: "Volume", Icon: VolumeIcon },
];

export function Component() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Animated State Icons</h1>
          <p className="text-muted-foreground">
            12 icons that morph between two meaningful states on loop — loading→success, play→pause, lock→unlock. Each tells a micro-story.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {ALL_ICONS.map(({ name, Icon }) => (
            <div key={name} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
              <div className="flex h-16 w-16 items-center justify-center">
                <Icon size={40} className="text-foreground" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
