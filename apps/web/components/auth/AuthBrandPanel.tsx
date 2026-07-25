"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Zap, TrendingUp } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const CHIPS = [
  { icon: Sparkles, label: "127 leads today", top: "22%", offset: "right-6" },
  { icon: Zap, label: "Reply in 4 min", top: "40%", offset: "right-12" },
  { icon: TrendingUp, label: "3.2x more meetings", top: "58%", offset: "right-4" },
] as const;

export function AuthBrandPanel() {
  const reduce = useReducedMotion();

  return (
    <div className="hidden lg:block relative w-[44%] overflow-hidden bg-[#2D1B69]">
      {/* Layer 1 — Full-bleed portrait with Ken Burns pan/zoom */}
      <motion.div
        className="absolute inset-0"
        initial={reduce ? false : { scale: 1.08, x: 0, y: 0 }}
        animate={reduce ? undefined : { scale: 1.14, x: -12, y: -8 }}
        transition={{
          duration: 20,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse",
        }}
      >
        <Image
          src="/arya-human.jpeg"
          alt=""
          fill
          priority
          sizes="44vw"
          className="object-cover object-[center_18%]"
        />
      </motion.div>

      {/* Layer 2 — Violet color-wash to keep brand cohesion */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(108,71,255,0.32) 0%, rgba(139,92,246,0.28) 45%, rgba(236,72,153,0.22) 100%)",
          mixBlendMode: "multiply",
        }}
      />

      {/* Layer 3 — Vertical legibility scrim */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(20,10,60,0.55) 0%, rgba(20,10,60,0.10) 30%, rgba(20,10,60,0.15) 55%, rgba(15,5,45,0.90) 100%)",
        }}
      />

      {/* Layer 4 — Ambient breathing pink glow, top-right (off-face) */}
      <motion.div
        aria-hidden
        className="absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full blur-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(236,72,153,0.40) 0%, transparent 70%)",
        }}
        initial={reduce ? false : { opacity: 0.5, scale: 0.95 }}
        animate={reduce ? undefined : { opacity: 0.85, scale: 1.08 }}
        transition={{
          duration: 5,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />

      {/* Layer 5 — Second ambient glow, bottom-left violet */}
      <motion.div
        aria-hidden
        className="absolute -bottom-32 -left-24 h-[400px] w-[400px] rounded-full blur-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(108,71,255,0.45) 0%, transparent 70%)",
        }}
        initial={reduce ? false : { opacity: 0.6, scale: 1 }}
        animate={reduce ? undefined : { opacity: 0.9, scale: 1.1 }}
        transition={{
          duration: 6,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse",
          delay: 1.2,
        }}
      />

      {/* Layer 6 — Content */}
      <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
        {/* Top: Live status pill */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-xs font-medium tracking-wide text-white/95">
              Arya is working · live
            </span>
          </div>
        </motion.div>

        {/* Floating glassmorphic chips — anchored to right side, staggered entrance + gentle drift */}
        {CHIPS.map((chip, i) => {
          const Icon = chip.icon;
          return (
            <motion.div
              key={chip.label}
              className={`absolute ${chip.offset}`}
              style={{ top: chip.top }}
              initial={reduce ? false : { opacity: 0, y: 12, x: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: EASE, delay: 0.55 + i * 0.18 }}
            >
              <div
                className="chip-drift flex items-center gap-2 rounded-full border border-white/25 bg-white/12 px-3.5 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl"
                style={{ animationDelay: `${i * 1.4}s` }}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-pink-300 to-violet-300 text-[#3D1F87]">
                  <Icon className="h-3 w-3" strokeWidth={2.75} />
                </span>
                <span className="whitespace-nowrap text-xs font-semibold text-white">
                  {chip.label}
                </span>
              </div>
            </motion.div>
          );
        })}

        {/* Bottom: headline + trust + marquee */}
        <div className="space-y-6">
          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
            className="text-[42px] font-bold leading-[1.05] tracking-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.45)]"
          >
            Put outbound on
            <br />
            autopilot with{" "}
            <span className="bg-gradient-to-r from-pink-300 via-fuchsia-200 to-violet-200 bg-clip-text text-transparent">
              Arya
            </span>
          </motion.h2>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.4 }}
          >
            <p className="text-sm text-white/80 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
              AI-powered outbound for B2B teams
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
