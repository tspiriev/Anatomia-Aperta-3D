import { useCallback, useEffect, useRef, useState } from 'react';

/** Fullscreen the viewer's wrapper, not the remote iframe, so labels stay visible. */
export function useViewerFullscreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const transitioning = useRef(false);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container || transitioning.current) return;
    transitioning.current = true;
    try {
      if (isFullscreen) {
        if (document.fullscreenElement === container) await document.exitFullscreen();
        setIsFullscreen(false);
        setIsNativeFullscreen(false);
      } else {
        setIsFullscreen(true);
        try {
          if (!container.requestFullscreen) throw new Error('Fullscreen API unavailable');
          await container.requestFullscreen();
          setIsNativeFullscreen(document.fullscreenElement === container);
        } catch {
          // Some embedded browsers disallow native fullscreen. The same viewer
          // and labels can still fill the app viewport without being remounted.
          setIsNativeFullscreen(false);
        }
      }
      container.focus({ preventScroll: true });
    } finally {
      transitioning.current = false;
    }
  }, [isFullscreen]);

  useEffect(() => {
    const sync = () => {
      const active = document.fullscreenElement === containerRef.current;
      setIsFullscreen(active);
      setIsNativeFullscreen(active);
    };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  useEffect(() => {
    let frame: number | undefined;
    let timers: ReturnType<typeof setTimeout>[] = [];
    const returnKeyboardFocus = (event?: Event) => {
      if (event?.type === 'focusin' && (event.target as HTMLElement | null)?.tagName !== 'IFRAME') return;
      // Cross-origin iframe key events cannot bubble to our F/Escape handler.
      // Keep keyboard focus on its wrapper; pointer/camera interaction remains
      // inside Sketchfab, while app shortcuts work after clicking or dragging.
      // The active element can still be the body when blur first fires.
      // Check after the browser has finished moving focus into the iframe.
      const restore = () => {
        if (containerRef.current?.contains(document.activeElement)
          && document.activeElement?.tagName === 'IFRAME') {
          containerRef.current.focus({ preventScroll: true });
        }
      };
      if (frame !== undefined) cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      frame = requestAnimationFrame(restore);
      // Safari can finish transferring focus after the first animation frame.
      // Bounded retries cover that delay without polling or stealing text focus.
      timers = [0, 100].map(delay => setTimeout(restore, delay));
    };
    window.addEventListener('blur', returnKeyboardFocus);
    document.addEventListener('focusin', returnKeyboardFocus, true);
    return () => {
      window.removeEventListener('blur', returnKeyboardFocus);
      document.removeEventListener('focusin', returnKeyboardFocus, true);
      if (frame !== undefined) cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
    };
  }, []);

  return { containerRef, isFullscreen, isNativeFullscreen, toggleFullscreen };
}
