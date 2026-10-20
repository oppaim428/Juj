import { useEffect, useRef } from "react";

/** Decorative, non-interactive dust; all appearance comes from theme tokens. */
export function DustEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;
    let width = 0;
    let height = 0;
    let color = "";
    const particles = Array.from({ length: 100 }, (_, i) => ({
      x: ((i * 37 + 11) % 101) / 101,
      y: ((i * 53 + 17) % 103) / 103,
      size: 1.5 + (i % 3) * 0.7,
      speed: 0.008 + (i % 5) * 0.002,
      opacity: 0.65 + (i % 4) * 0.1,
    }));
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      color = getComputedStyle(document.documentElement).getPropertyValue("--dust").trim();
    };
    const draw = (now: number) => {
      const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      context.clearRect(0, 0, width, height);
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 5;
      for (const particle of particles) {
        if (!reducedMotion.matches) {
          particle.y = (particle.y - particle.speed * delta + 1) % 1;
          particle.x = (particle.x + particle.speed * delta * 0.35) % 1;
        }
        context.globalAlpha = particle.opacity;
        context.beginPath();
        context.arc(particle.x * width, particle.y * height, particle.size / 2, 0, Math.PI * 2);
        context.fill();
      }
      if (!reducedMotion.matches) frame = requestAnimationFrame(draw);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      resize();
      frame = requestAnimationFrame(draw);
    };
    const themeObserver = new MutationObserver(restart);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-glow"] });
    window.addEventListener("resize", restart);
    reducedMotion.addEventListener("change", restart);
    restart();
    return () => {
      cancelAnimationFrame(frame);
      themeObserver.disconnect();
      window.removeEventListener("resize", restart);
      reducedMotion.removeEventListener("change", restart);
    };
  }, []);

  return <canvas ref={canvasRef} className="dust-effect" aria-hidden="true" />;
}