"use client";

import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

export default function HomeScreenPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Don't show if already running as installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if user dismissed it before
    if (localStorage.getItem("pwa-prompt-dismissed")) return;

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (iOS) {
      setIsIOS(true);
      setShow(true);
      return;
    }

    // Android / Chrome — wait for the browser's install event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("pwa-prompt-dismissed", "1");
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-3 right-3 z-50 md:hidden">
      <div className="bg-purple-700 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3 border border-purple-500">
        <div className="text-2xl flex-shrink-0 mt-0.5">📱</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">Add Quizzer to Home Screen</p>
          {isIOS ? (
            <p className="text-xs text-purple-200 mt-1 leading-relaxed">
              Tap the <span className="bg-purple-600 px-1 rounded font-semibold">Share</span> button, then{" "}
              <span className="font-semibold">Add to Home Screen</span>
            </p>
          ) : (
            <p className="text-xs text-purple-200 mt-1">Install for quick access — works offline too</p>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end flex-shrink-0">
          {!isIOS && (
            <button
              onClick={install}
              className="px-3 py-1.5 bg-white text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-50 transition"
            >
              Install
            </button>
          )}
          <button onClick={dismiss} className="p-1 text-purple-300 hover:text-white transition">
            <FaTimes className="text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
}
