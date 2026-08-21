"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, LayoutDashboard, Ticket } from "lucide-react";

const T = {
  drop: 750,
  flaps: 1450,
  tape: 2050,
  stamp: 2550,
  load: 3650,
  drive: 4500,
  done: 5600,
};

type Phase = "idle" | "drop" | "flaps" | "tape" | "stamp" | "load" | "drive" | "done";

function phaseAt(ms: number): Phase {
  if (ms < T.drop) return "idle";
  if (ms < T.flaps) return "drop";
  if (ms < T.tape) return "flaps";
  if (ms < T.stamp) return "tape";
  if (ms < T.load) return "stamp";
  if (ms < T.drive) return "load";
  if (ms < T.done) return "drive";
  return "done";
}

const CAPTIONS: Record<Phase, string> = {
  idle: "Packing your ticket…",
  drop: "Packing your ticket…",
  flaps: "Sealing the box…",
  tape: "Sealing the box…",
  stamp: "Approved & stamped!",
  load: "Loading the delivery truck…",
  drive: "Out for delivery!",
  done: "Delivered!",
};

const STEPS = ["Pack", "Seal", "Stamp", "Ship"];

function stepIndex(phase: Phase): number {
  switch (phase) {
    case "idle":
    case "drop":
      return 0;
    case "flaps":
    case "tape":
      return 1;
    case "stamp":
      return 2;
    case "load":
    case "drive":
      return 3;
    default:
      return 4;
  }
}

const CONFETTI = [
  { x: -70, y: -46, c: "bg-indigo-500", r: -160 },
  { x: 66, y: -52, c: "bg-emerald-500", r: 140 },
  { x: -88, y: 8, c: "bg-amber-400", r: -200 },
  { x: 90, y: 2, c: "bg-rose-500", r: 180 },
  { x: -48, y: -78, c: "bg-sky-400", r: -120 },
  { x: 44, y: -84, c: "bg-violet-500", r: 150 },
  { x: -92, y: -20, c: "bg-zinc-400", r: -170 },
  { x: 96, y: -26, c: "bg-indigo-300", r: 200 },
  { x: -20, y: -95, c: "bg-emerald-400", r: -140 },
  { x: 18, y: 60, c: "bg-amber-300", r: 130 },
];

type CardProps = {
  onDashboard?: () => void;
  onViewTickets?: () => void;
};

function ShipmentCard({ onDashboard, onViewTickets }: CardProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const t = performance.now() - start;
      setElapsed(t);
      if (t >= T.done + 50) return;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const phase = phaseAt(elapsed);
  const idx = stepIndex(phase);
  const tSinceStamp = elapsed - T.stamp;

  const flapsClosed = phase !== "idle" && phase !== "drop";
  const sealed =
    phase === "tape" || phase === "stamp" || phase === "load" || phase === "drive" || phase === "done";
  const stamped = phase === "load" || phase === "drive" || phase === "done";
  const loading = phase === "load";
  const driving = phase === "drive";
  const finished = phase === "done";
  const beltVisible =
    phase === "idle" || phase === "drop" || phase === "flaps" || phase === "tape" || phase === "stamp";

  return (
    <>
      <p className="text-center text-[12px] font-medium uppercase tracking-[0.24em] text-zinc-400">
        IT Support
      </p>
      <h2 className="mt-3 text-center text-[30px] sm:text-[36px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {CAPTIONS[phase]}
      </h2>

      <div className="mt-6 flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`rounded-full transition-all duration-300 ${
                i < idx
                  ? "w-2 h-2 bg-emerald-500"
                  : i === idx
                    ? "w-8 h-2 bg-zinc-900 dark:bg-white"
                    : "w-2 h-2 bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
            {i < STEPS.length - 1 && (
              <span
                className={`w-8 h-px ${i < idx ? "bg-emerald-400" : "bg-zinc-200 dark:bg-zinc-800"}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="relative mt-8 flex h-[260px] sm:h-[340px] w-full items-center justify-center">
        <div className="relative h-[240px] w-[320px] scale-100 sm:scale-[1.3]">
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: finished ? 0 : 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* ground shadow */}
            <div className="absolute bottom-[26px] left-1/2 -translate-x-1/2 h-[10px] w-[280px] rounded-full bg-black/10 dark:bg-black/40 blur-md" />

            {/* conveyor belt */}
            <motion.div
              className="absolute bottom-[38px] inset-x-[10px] h-[16px] rounded-full bg-zinc-800 dark:bg-zinc-700 overflow-hidden shadow-inner"
              animate={{ opacity: beltVisible ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, rgba(255,255,255,0.22) 0 10px, transparent 10px 24px)",
                }}
                animate={{ backgroundPositionX: ["0px", "-48px"] }}
                transition={{ duration: 1.4, ease: "linear", repeat: Infinity }}
              />
            </motion.div>

            {/* ticket */}
            <motion.div
              className="absolute left-1/2 top-[24px] -ml-[35px] w-[70px] h-[48px] bg-white dark:bg-zinc-100 rounded-lg shadow-lg border border-black/5 p-2 flex flex-col gap-[5px]"
              animate={
                phase === "idle"
                  ? { y: [0, -7, 0], rotate: -4 }
                  : phase === "drop"
                    ? { y: 94, rotate: 5, opacity: 1 }
                    : { y: 94, rotate: 5, opacity: 0 }
              }
              transition={
                phase === "idle"
                  ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                  : phase === "drop"
                    ? { duration: 0.55, ease: [0.45, 0, 0.7, 0.3] }
                    : { duration: 0.15 }
              }
            >
              <div className="h-[7px] w-8 rounded-full bg-indigo-500/80" />
              <div className="h-[4px] w-full rounded-full bg-zinc-300" />
              <div className="h-[4px] w-4/5 rounded-full bg-zinc-300" />
              <div className="mt-auto flex items-end justify-between">
                <div
                  className="h-[8px] w-[26px] rounded-[2px] bg-zinc-800 dark:bg-zinc-700"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, transparent 0 2px, white 2px 3px)",
                  }}
                />
                <div className="h-[10px] w-[10px] rounded-full border-[2px] border-indigo-400" />
              </div>
            </motion.div>

            {/* convoy: truck + box move together when driving */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={driving ? { x: 430 } : { x: 0 }}
              transition={
                driving
                  ? { x: { duration: 1.0, ease: [0.6, 0, 0.85, 0.4] } }
                  : { duration: 0.2 }
              }
            >
              {/* delivery truck */}
              <motion.div
                className="absolute left-[178px] bottom-[48px] w-[136px] h-[74px]"
                initial={{ x: -340 }}
                animate={{
                  x: driving ? 430 : loading ? 0 : -340,
                  y: driving ? [0, -3, 0, -2, 0] : 0,
                }}
                transition={
                  driving
                    ? {
                        x: { duration: 1.0, ease: [0.6, 0, 0.85, 0.4] },
                        y: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
                      }
                    : loading
                      ? { x: { duration: 0.6, ease: "easeOut" }, y: { duration: 0.2 } }
                      : { duration: 0.2 }
                }
              >
                {/* exhaust puffs */}
                {(loading || driving) && (
                  <>
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="absolute right-full top-[38px] w-[10px] h-[10px] rounded-full bg-zinc-400/70 dark:bg-zinc-500/70"
                        animate={{ x: [4, -30], scale: [0.4, 1.5], opacity: [0.55, 0] }}
                        transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.14, ease: "easeOut" }}
                      />
                    ))}
                  </>
                )}

                {/* speed streaks */}
                {driving && (
                  <>
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="absolute right-full mr-8 h-[3px] rounded-full bg-zinc-400 dark:bg-zinc-500"
                        style={{ top: 14 + i * 22, width: 14 + i * 8 }}
                        animate={{ x: [-4, -40], opacity: [0, 0.9, 0] }}
                        transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.08, ease: "easeOut" }}
                      />
                    ))}
                  </>
                )}

                {/* cargo bed */}
                <div className="absolute left-0 top-0 w-[94px] h-[54px] rounded-lg bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 shadow-sm overflow-hidden">
                  <div className="absolute inset-y-[6px] left-[28px] w-px bg-black/[0.07] dark:bg-white/10" />
                  <div className="absolute inset-y-[6px] left-[58px] w-px bg-black/[0.07] dark:bg-white/10" />
                  <div className="absolute bottom-[5px] left-[8px] text-[7px] font-bold tracking-[0.22em] text-zinc-300 dark:text-zinc-600">
                    ACE·IT
                  </div>
                </div>

                {/* cab */}
                <div className="absolute right-0 top-[12px] w-[46px] h-[42px] rounded-[10px] rounded-tr-[18px] bg-indigo-500 shadow-sm">
                  <div className="absolute right-[7px] top-[6px] w-[22px] h-[15px] rounded-md bg-sky-100/90 dark:bg-sky-200/80" />
                  <div className="absolute -bottom-[3px] right-0 w-[12px] h-[7px] rounded-[3px] bg-zinc-700 dark:bg-zinc-900" />
                </div>

                {/* chassis */}
                <div className="absolute bottom-[16px] left-[2px] right-[2px] h-[6px] rounded-full bg-zinc-700 dark:bg-zinc-900" />

                {/* wheels */}
                {[16, 100].map((wx) => (
                  <motion.div
                    key={wx}
                    className="absolute bottom-0 w-[22px] h-[22px] rounded-full bg-zinc-900 border-[3px] border-zinc-600 dark:border-zinc-500"
                    style={{ left: wx }}
                    animate={{ rotate: driving ? 540 : 0 }}
                    transition={{ duration: 1.0, ease: driving ? "linear" : "easeOut" }}
                  >
                    <div className="absolute left-1/2 top-[1px] bottom-[1px] w-[2px] -ml-[1px] bg-zinc-500 rounded-full" />
                    <div className="absolute top-1/2 left-[1px] right-[1px] h-[2px] -mt-[1px] bg-zinc-500 rounded-full" />
                    <div className="absolute inset-[5px] rounded-full bg-zinc-400/80" />
                  </motion.div>
                ))}
              </motion.div>

              {/* box group */}
              <motion.div
                className="absolute bottom-[54px] left-1/2 -ml-[60px] w-[120px]"
                style={{ transformOrigin: "bottom center" }}
                animate={
                  loading
                    ? { x: [0, 34, 66, 66], y: [0, -48, -24, -24], scale: [1, 1.04, 0.78, 0.78], rotate: [0, -4, 2, 0] }
                    : driving
                      ? { x: 66, y: -24, scale: 0.78, rotate: 0 }
                      : { x: 0, y: 0, scale: 1, rotate: 0 }
                }
                transition={
                  loading
                    ? {
                        delay: 0.25,
                        duration: 0.6,
                        times: [0, 0.45, 0.85, 1],
                        ease: "easeOut",
                      }
                    : { duration: 0.2 }
                }
              >
                <div className="relative h-[84px]">
                  {/* open mouth (inside of box) */}
                  <motion.div
                    className="absolute -top-[12px] left-[5px] right-[5px] h-[14px] rounded-t-md bg-[#6b4413]/80 dark:bg-[#3d2708]/90"
                    animate={{ opacity: flapsClosed ? 0 : 1 }}
                    transition={{ duration: 0.25 }}
                  />

                  {/* left flap */}
                  <motion.div
                    className="absolute -top-[13px] left-0 w-[58px] h-[13px] rounded-sm bg-gradient-to-b from-[#d99f43] to-[#c08a32] shadow-sm"
                    style={{ transformOrigin: "left center" }}
                    animate={{ rotate: flapsClosed ? 0 : -34, y: flapsClosed ? 0 : -4 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  />
                  {/* right flap */}
                  <motion.div
                    className="absolute -top-[13px] right-0 w-[58px] h-[13px] rounded-sm bg-gradient-to-b from-[#d99f43] to-[#c08a32] shadow-sm"
                    style={{ transformOrigin: "right center" }}
                    animate={{ rotate: flapsClosed ? 0 : 34, y: flapsClosed ? 0 : -4 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  />

                  {/* front face */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-[#e7ab52] to-[#cf9038] shadow-md border border-black/10" />
                  <div className="absolute inset-y-0 left-[10px] w-px bg-black/10" />
                  <div className="absolute inset-y-0 right-[10px] w-px bg-black/10" />

                  {/* stamped imprint — appears only after the stamp has lifted away */}
                  <motion.div
                    className="absolute top-[22px] left-1/2 -ml-[27px] w-[54px] h-[54px] -rotate-[14deg] rounded-full border-[3px] border-red-500/70 flex items-center justify-center"
                    animate={{ opacity: stamped ? 0.75 : 0, scale: stamped ? 1 : 1.15 }}
                    transition={{ duration: 0.25 }}
                  >
                    <span className="text-[8px] font-extrabold tracking-[0.14em] text-red-500/90">SHIPPED</span>
                  </motion.div>

                  {/* tape */}
                  <motion.div
                    className="absolute -top-[9px] left-1/2 -ml-[56px] w-[112px] h-[9px] rounded-[2px] bg-amber-100/95 border-x border-amber-300/70"
                    style={{ transformOrigin: "center" }}
                    animate={{ scaleX: sealed ? 1 : 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <div
                      className="absolute inset-0 opacity-60"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(90deg, rgba(180,140,60,0.35) 0 6px, transparent 6px 12px)",
                      }}
                    />
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>

            {/* stamp */}
            <AnimatePresence>
              {phase === "stamp" && (
                <motion.div
                  key="stamp"
                  className="absolute left-1/2 top-[58px] -ml-[34px] w-[68px] h-[68px] -rotate-[14deg] rounded-full border-[3.5px] border-red-500 bg-red-500/10 flex items-center justify-center shadow-lg z-10"
                  initial={{ opacity: 0, scale: 2.5, y: -64 }}
                  animate={
                    tSinceStamp > 850
                      ? { opacity: 0, y: -46, scale: 1.06 }
                      : { opacity: 1, scale: 1, y: 0 }
                  }
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.25,
                    scale: { type: "spring", stiffness: 850, damping: 23 },
                    y: { type: "spring", stiffness: 850, damping: 23 },
                  }}
                >
                  <div className="absolute inset-[5px] rounded-full border border-red-500/60" />
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-[9px] font-extrabold tracking-[0.16em] text-red-600">SHIPPED</span>
                    <span className="mt-[2px] text-[6px] font-bold tracking-[0.3em] text-red-500">ACE·IT</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* success overlay */}
          <AnimatePresence>
            {finished && (
              <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20"
              >
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {CONFETTI.map((p, i) => (
                    <motion.span
                      key={i}
                      className={`absolute left-1/2 top-[64px] w-[7px] h-[7px] rounded-[2px] ${p.c}`}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
                      animate={{ x: p.x, y: p.y, opacity: 0, scale: 1, rotate: p.r }}
                      transition={{ duration: 0.8, delay: 0.12 + i * 0.03, ease: "easeOut" }}
                    />
                  ))}
                </div>

                <div className="h-full flex flex-col items-center justify-center gap-5 px-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.05 }}
                    className="w-16 h-16 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 flex items-center justify-center"
                  >
                    <Check className="h-8 w-8 text-white" strokeWidth={3} />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center space-y-1.5"
                  >
                    <p className="text-[19px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                      Your ticket is on its way
                    </p>
                    <p className="text-[14px] font-light text-zinc-500 dark:text-zinc-400">
                      Packed, stamped and shipped to the IT team.
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* end actions */}
      <AnimatePresence>
        {finished && (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-4 flex flex-col items-center gap-4"
          >
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {onViewTickets && (
                <button
                  type="button"
                  onClick={onViewTickets}
                  className="h-12 px-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[15px] font-medium shadow-md hover:shadow-lg active:scale-[0.98] transition-all inline-flex items-center gap-2"
                >
                  <Ticket className="h-4 w-4" />
                  Go to My Tickets
                </button>
              )}
              {onDashboard && (
                <button
                  type="button"
                  onClick={onDashboard}
                  className="h-12 px-8 rounded-full border border-black/10 dark:border-white/15 text-zinc-600 dark:text-zinc-300 text-[15px] font-medium hover:bg-black/5 dark:hover:bg-white/10 active:scale-[0.98] transition-all inline-flex items-center gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Go to Dashboard
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

type Props = {
  open: boolean;
  onDashboard?: () => void;
  onViewTickets?: () => void;
};

export default function TicketShipmentAnimation({ open, onDashboard, onViewTickets }: Props) {
  const dashboardRef = useRef(onDashboard);
  const ticketsRef = useRef(onViewTickets);
  useEffect(() => {
    dashboardRef.current = onDashboard;
    ticketsRef.current = onViewTickets;
  }, [onDashboard, onViewTickets]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-zinc-50 dark:bg-zinc-950 overflow-hidden"
    >
      <div
        className="absolute inset-0 block dark:hidden opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(circle at 1.5px 1.5px, black 1.5px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        className="absolute inset-0 hidden dark:block opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="relative h-full flex flex-col items-center justify-center px-6 py-10"
      >
        <ShipmentCard
          onDashboard={() => dashboardRef.current?.()}
          onViewTickets={() => ticketsRef.current?.()}
        />
      </motion.div>
    </motion.div>,
    document.body
  );
}
