import AnimatedBackground from "@/components/animated/AnimatedBackground";

export default function HelpdeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-screen">
      <AnimatedBackground />
      <main className="relative z-10 h-full overflow-y-auto">{children}</main>
    </div>
  );
}
