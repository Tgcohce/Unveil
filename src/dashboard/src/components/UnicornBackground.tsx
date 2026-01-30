import { useEffect, useRef } from "react";

// Declare the global UnicornStudio type
declare global {
  interface Window {
    UnicornStudio: {
      addScene: (options: {
        elementId: string;
        fps?: number;
        scale?: number;
        dpi?: number;
        filePath?: string;
        lazyLoad?: boolean;
        fixed?: boolean;
        altText?: string;
        ariaLabel?: string;
        production?: boolean;
        interactivity?: {
          mouse?: {
            disableMobile?: boolean;
            disabled?: boolean;
          };
        };
      }) => Promise<{
        destroy: () => void;
        resize: () => void;
        paused: boolean;
      }>;
      destroy: () => void;
    };
  }
}

export default function UnicornBackground() {
  const sceneRef = useRef<{ destroy: () => void; resize: () => void; paused: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait for UnicornStudio to be loaded
    const initScene = async () => {
      if (!window.UnicornStudio) {
        console.warn("UnicornStudio not loaded yet, retrying...");
        setTimeout(initScene, 100);
        return;
      }

      try {
        const scene = await window.UnicornStudio.addScene({
          elementId: "unicorn-bg",
          fps: 60,
          scale: 1,
          dpi: 1.5,
          filePath: "/unicorn-bg.json",
          lazyLoad: false,
          fixed: true,
          altText: "UNVEIL Background Animation",
          ariaLabel: "Animated gradient background with 3D geometric shape",
          production: false,
          interactivity: {
            mouse: {
              disableMobile: false,
              disabled: false,
            },
          },
        });
        sceneRef.current = scene;
      } catch (err) {
        console.error("Failed to initialize Unicorn scene:", err);
      }
    };

    initScene();

    // Cleanup on unmount
    return () => {
      if (sceneRef.current) {
        sceneRef.current.destroy();
      }
    };
  }, []);

  return (
    <div
      id="unicorn-bg"
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
