import { useEffect, useRef } from "react";
import styles from "../styles/LoginAuroraBackground.module.css";

export default function LoginAuroraBackground() {
  const backgroundRef = useRef(null);

  useEffect(() => {
    const background = backgroundRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let pointerX = 0.5;
    let pointerY = 0.3;

    const updatePointer = () => {
      frame = 0;
      background.style.setProperty("--pointer-x", `${pointerX * 100}%`);
      background.style.setProperty("--pointer-y", `${pointerY * 100}%`);
      background.style.setProperty("--shift-x", `${(pointerX - 0.5) * 32}px`);
      background.style.setProperty("--shift-y", `${(pointerY - 0.3) * 24}px`);
    };

    const move = (event) => {
      if (reducedMotion.matches || !finePointer.matches || event.pointerType === "touch") return;
      pointerX = Math.min(1, Math.max(0, event.clientX / window.innerWidth));
      pointerY = Math.min(1, Math.max(0, event.clientY / window.innerHeight));
      if (!frame) frame = window.requestAnimationFrame(updatePointer);
    };

    const reset = () => {
      window.cancelAnimationFrame(frame);
      pointerX = 0.5;
      pointerY = 0.3;
      updatePointer();
    };

    const updateVisibility = () => {
      background.dataset.paused = String(document.hidden);
      if (document.hidden) reset();
    };

    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", reset);
    reducedMotion.addEventListener("change", reset);
    finePointer.addEventListener("change", reset);
    document.addEventListener("visibilitychange", updateVisibility);
    updateVisibility();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", reset);
      reducedMotion.removeEventListener("change", reset);
      finePointer.removeEventListener("change", reset);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  return (
    <div ref={backgroundRef} className={styles.background} aria-hidden="true">
      <div className={styles.parallax}><div className={styles.ribbons} /></div>
      <div className={styles.spotlight} />
      <div className={styles.vignette} />
    </div>
  );
}
