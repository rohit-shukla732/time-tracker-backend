"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="fixed inset-0 bg-zinc-50 dark:bg-zinc-950 pointer-events-none -z-50" />;
  }

  return (
    <div className="fixed inset-0 pointer-events-none -z-50 overflow-hidden bg-zinc-50 dark:bg-zinc-950 selection:bg-none">
      {/* 
        Ultra-minimal Dot Grid Architecture
        Provides a static, premium tech aesthetic without any floating blobs.
      */}
      <div 
        className="absolute inset-0 block dark:hidden opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(circle at 1.5px 1.5px, black 1.5px, transparent 0)", backgroundSize: "32px 32px" }}
      />
      <div 
        className="absolute inset-0 hidden dark:block opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)", backgroundSize: "32px 32px" }}
      />

      {/* 
        Vignette / Fade Masks 
        Softly blending the grid out at the edges to keep the viewport focused
      */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-50/60 to-zinc-50 dark:via-zinc-950/60 dark:to-zinc-950" />
      <div className="absolute inset-0 block dark:hidden" style={{ background: "radial-gradient(ellipse at top, transparent 20%, #fafafa 100%)" }} />
      <div className="absolute inset-0 hidden dark:block" style={{ background: "radial-gradient(ellipse at top, transparent 20%, #09090b 100%)" }} />

      {/* 
        Ambient Breath (No Shapes) 
        A very subtle, wide linear sheen that simply pans diagonally to provide life
      */}
      <motion.div
        className="absolute inset-[-100%] z-0"
        style={{
          background: "linear-gradient(45deg, transparent 0%, transparent 40%, rgba(150,150,150,0.04) 50%, transparent 60%, transparent 100%)",
        }}
        animate={{
          x: ["-50%", "0%"],
          y: ["-50%", "0%"],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Subtle top edge pulse */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[40vh]"
        style={{
          background: "linear-gradient(to bottom, rgba(150,150,150,0.03) 0%, transparent 100%)"
        }}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Fine-grain matte texture */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04] mix-blend-overlay z-10"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      />
    </div>
  );
}
