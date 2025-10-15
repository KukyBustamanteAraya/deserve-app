"use client";

/**
 * Background layers with grid pattern and optional noise texture
 * Fixed positioning, sits behind all content with pointer-events disabled
 */
export default function Backdrop() {
  return (
    <>
      {/* Grid pattern - subtle lines forming a grid */}
      <div
        className="df-grid fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,.06) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(70% 60% at 50% 0%, rgba(0,0,0,0) 0%, rgba(0,0,0,.6) 60%, rgba(0,0,0,1) 100%)",
          opacity: 0.25
        }}
      />

      {/* Noise texture overlay - if noise.png exists */}
      <div
        className="df-noise fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/noise.png')",
          mixBlendMode: "overlay",
          opacity: 0.03
        }}
      />
    </>
  );
}
