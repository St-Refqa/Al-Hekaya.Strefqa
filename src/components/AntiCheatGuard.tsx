import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ShieldAlert, EyeOff } from "lucide-react";

export function AntiCheatGuard() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [isBlurred, setIsBlurred] = useState(false);

  // Determine if check is active
  // Active on public assessment path or any student paths or resources
  const isActive =
    location.pathname.startsWith("/assessment/") ||
    location.pathname.startsWith("/student") ||
    location.pathname.startsWith("/resources") ||
    location.pathname === "/";

  useEffect(() => {
    if (!isActive) {
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      (document.body.style as any).msUserSelect = "";
      (document.body.style as any).mozUserSelect = "";
      return;
    }

    // Apply strict selection prevention
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    (document.body.style as any).msUserSelect = "none";
    (document.body.style as any).mozUserSelect = "none";

    // Prevent context menu (right click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Prevent key shortcuts & PrintScreen
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key triggers detection
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        setIsBlurred(true);
      }

      // F12 developer tools
      if (e.key === "F12") {
        e.preventDefault();
      }

      // Ctrl + Shift + I / J (Dev Tools) or Ctrl + Shift + C
      if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) {
        e.preventDefault();
      }

      // Meta (Mac cmd) or Ctrl shortcuts: C (Copy), X (Cut), U (Source), P (Print), S (Save)
      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "x", "u", "p", "s"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
    };

    // Prevent copy/cut/drag actions
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    // Monitor page focus loss to prevent screenshot tools / tab switching
    const handleBlur = () => {
      // Slight timeout to avoid instant blur on small dropdown selection overlays
      setTimeout(() => {
        if (document.activeElement?.tagName === "IFRAME") {
          // Iframe click focus change can trigger blur, let's keep track
          return;
        }
        setIsBlurred(true);
      }, 200);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsBlurred(true);
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("dragstart", handleDragStart);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      (document.body.style as any).msUserSelect = "";
      (document.body.style as any).mozUserSelect = "";

      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <>
      {/* Global CSS injected to prevent highlight & right-click highlights */}
      <style>{`
        body {
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          user-select: none !important;
        }
        img {
          pointer-events: none !important;
          -webkit-user-drag: none !important;
        }
      `}</style>

      {/* Elegant, high-security Shield overlay removed to prevent file-picker issues */}
    </>
  );
}
