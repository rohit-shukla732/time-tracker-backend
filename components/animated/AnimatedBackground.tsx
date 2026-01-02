"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function AnimatedBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);
  const [beams, setBeams] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    speed: number;
  }>>([]);
  
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
    maxLife: number;
  }>>([]);
  
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  
  // Simple cursor spring
  const cursorXSpring = useSpring(cursorX, { damping: 20, stiffness: 200 });
  const cursorYSpring = useSpring(cursorY, { damping: 20, stiffness: 200 });

  // Grid configuration
  const gridSize = 50; // Same as CSS grid

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isClient, cursorX, cursorY]);

  // Beam and particle animation logic
  useEffect(() => {
    if (!isClient) return;

    let animationId: number;
    let beamId = 0;
    let particleId = 0;

    const createBeam = () => {
      const screenWidth = window.innerWidth;
      
      // Start at a random grid column at the top
      const startX = Math.floor(Math.random() * (screenWidth / gridSize)) * gridSize;
      
      // Extended color palette with more vibrant options
      const colors = [
        'rgb(59, 130, 246)',   // Blue
        'rgb(16, 185, 129)',   // Emerald
        'rgb(139, 92, 246)',   // Violet
        'rgb(236, 72, 153)',   // Pink
        'rgb(251, 146, 60)',   // Orange
        'rgb(34, 197, 94)',    // Green
        'rgb(245, 101, 101)',  // Red
        'rgb(168, 85, 247)',   // Purple
        'rgb(14, 165, 233)',   // Sky Blue
        'rgb(132, 204, 22)',   // Lime
        'rgb(234, 179, 8)',    // Yellow
        'rgb(239, 68, 68)',    // Rose
        'rgb(99, 102, 241)',   // Indigo
        'rgb(6, 182, 212)',    // Cyan
        'rgb(168, 162, 158)',  // Stone
        'rgb(217, 119, 6)',    // Amber
        'rgb(220, 38, 127)',   // Fuchsia
        'rgb(101, 163, 13)',   // Green-400
        'rgb(37, 99, 235)',    // Blue-600
        'rgb(219, 39, 119)',   // Pink-600
        'rgb(245, 158, 11)',    // Amber-500
        'rgb(16, 185, 129)',   // Emerald-500
        'rgb(139, 92, 246)',   // Violet-500
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];

      return {
        id: beamId++,
        x: startX,
        y: -50, // Start above screen
        color,
        speed: 3 + Math.random() * 2 // Random speed between 3-5
      };
    };

    const createExplosion = (x: number, y: number, color: string) => {
      const explosionParticles = [];
      // Increased particle count from 12 to 20 for more spectacular explosions
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const speed = 2 + Math.random() * 4; // Increased speed range
        explosionParticles.push({
          id: particleId++,
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1, // Slight upward bias
          color,
          life: 80 + Math.random() * 40, // Variable lifetime 80-120 frames
          maxLife: 80 + Math.random() * 40
        });
      }
      
      // Add some extra center particles for density
      for (let i = 0; i < 8; i++) {
        explosionParticles.push({
          id: particleId++,
          x: x + (Math.random() - 0.5) * 10, // Slight random offset
          y: y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2 - 1,
          color,
          life: 60 + Math.random() * 30,
          maxLife: 60 + Math.random() * 30
        });
      }
      
      return explosionParticles;
    };

    const updateAnimation = () => {
      const screenHeight = window.innerHeight;
      
      // Update beams
      setBeams(prevBeams => {
        let updatedBeams = prevBeams.map(beam => ({
          ...beam,
          y: beam.y + beam.speed
        }));

        // Check for collisions with bottom and create explosions
        const collidedBeams = updatedBeams.filter(beam => beam.y >= screenHeight - 20);
        if (collidedBeams.length > 0) {
          setParticles(prevParticles => {
            const newExplosions = collidedBeams.flatMap(beam => 
              createExplosion(beam.x, screenHeight - 10, beam.color)
            );
            return [...prevParticles, ...newExplosions];
          });
        }

        // Remove collided beams
        updatedBeams = updatedBeams.filter(beam => beam.y < screenHeight - 20);

        return updatedBeams;
      });

      // Update particles
      setParticles(prevParticles => {
        return prevParticles
          .map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            vy: particle.vy + 0.1, // Gravity
            life: particle.life - 1
          }))
          .filter(particle => particle.life > 0);
      });

      // Add new beam occasionally - increased frequency and max beams
      setBeams(prevBeams => {
        if (Math.random() < 0.06 && prevBeams.length < 10 ) { // Increased from 0.035 to 0.06, max from 5 to 10
          return [...prevBeams, createBeam()];
        }
        return prevBeams;
      });
    };

    const animate = () => {
      updateAnimation();
      animationId = requestAnimationFrame(animate);
    };

    // Start with two beams for immediate visual impact
    setBeams([createBeam(), createBeam()]);
    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isClient, gridSize]);

  if (!isClient) {
    return <div className="fixed inset-0 pointer-events-none" />;
  }

  return (
    <>
      {/* Minimal grid pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            opacity: 0.02,
          }}
        />
      </div>

      {/* Falling beams and explosion particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Render beams */}
        {beams.map(beam => (
          <div
            key={beam.id}
            className="absolute"
            style={{
              left: beam.x - 2,
              top: beam.y - 30,
              width: '4px',
              height: '30px',
              background: `linear-gradient(180deg, transparent, ${beam.color})`,
              boxShadow: `0 0 8px ${beam.color}, 0 0 16px ${beam.color}60`,
              borderRadius: '2px',
            }}
          />
        ))}
        
        {/* Render explosion particles with enhanced visuals */}
        {particles.map(particle => {
          const opacity = particle.life / particle.maxLife;
          const size = 2 + (1 - opacity) * 4; // Particles get bigger as they fade (increased size)
          const glowIntensity = opacity * 0.9; // More intense glow
          
          return (
            <div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                left: particle.x - size/2,
                top: particle.y - size/2,
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: particle.color,
                opacity: opacity * 0.9, // Increased opacity
                boxShadow: `0 0 ${size * 2}px ${particle.color}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')}, 0 0 ${size * 4}px ${particle.color}40`,
                filter: `blur(${(1 - opacity) * 0.5}px)`, // Subtle blur as they fade
              }}
            />
          );
        })}
      </div>

      {/* Enhanced cursor follow with circle-in-circle design */}
      <div className="fixed inset-0 pointer-events-none z-50">
        
        {/* Outer dotted circle */}
        <motion.div
          className="absolute rounded-full"
          style={{
            left: cursorXSpring,
            top: cursorYSpring,
            transform: "translate(-50%, -50%)",
            border: "2px dotted",
            borderColor: "hsl(var(--foreground))",
            width: "32px",
            height: "32px",
            opacity: 0.4,
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            rotate: { duration: 8, repeat: Infinity, ease: "linear" }
          }}
        />
      </div>
    </>
  );
}