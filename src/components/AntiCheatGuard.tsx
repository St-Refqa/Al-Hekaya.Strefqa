import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ShieldAlert, EyeOff } from "lucide-react";

export function AntiCheatGuard() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [isBlurred, setIsBlurred] = useState(false);

  // Determine if check is active
  // Active on public assessment path or any student paths
  const isActive =
    !isAdmin &&
    (location.pathname.startsWith("/assessment/") ||
      location.pathname.startsWith("/student") ||
      location.pathname === "/");

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

      {/* Elegant, high-security Shield overlay if focus is lost (e.g. screenshot trigger, tab switch) */}
      {isBlurred && (
        <div 
          className="fixed inset-0 z-[999999] bg-brand-cream/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none"
          dir="rtl"
        >
          <div className="bg-white p-8 md:p-12 rounded-[40px] border border-brand-beige/20 shadow-2xl max-w-md w-full animate-tada flex flex-col items-center">
            <div className="w-20 h-20 bg-brand-red/10 rounded-full flex items-center justify-center mb-6 text-brand-red">
              <ShieldAlert className="w-10 h-10 animate-pulse" />
            </div>

            <h2 className="text-2xl font-black text-brand-text mb-4">
              حماية نزاهة الأسئلة نشطة 🛡️
            </h2>
            
            <p className="text-brand-text/70 text-sm leading-relaxed mb-6 font-medium">
              تم كشف تصوير الشاشة أو مغادرة نافذة الاختبار. يُرجى حماية سرية الأسئلة والتركيز بالكامل داخل هذه الصفحة لإتخاذ النتيجة الصحيحة بنجاح.
            </p>

            <button
              onClick={() => {
                setIsBlurred(false);
                window.focus();
              }}
              className="w-full bg-brand-red hover:bg-brand-red/90 text-white font-black py-4 px-6 rounded-2xl shadow-xl shadow-brand-red/20 transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2"
            >
              <EyeOff className="w-5 h-5" />
              <span>العودة للمتابعة الآن</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
