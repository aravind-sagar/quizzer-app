"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from "react-icons/fa";

export type ModalConfig = {
  type: "alert" | "confirm";
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "success" | "danger" | "info";
  onConfirm?: () => void;
};

export function Modal({
  config,
  onClose,
}: {
  config: ModalConfig | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!config || !mounted) return null;

  const iconMap = {
    success: <FaCheckCircle className="text-3xl text-green-500" />,
    danger: <FaExclamationTriangle className="text-3xl text-red-500" />,
    info: <FaInfoCircle className="text-3xl text-purple-500" />,
  };

  const buttonMap = {
    success: "bg-green-500 hover:bg-green-600 text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    info: "bg-purple-600 hover:bg-purple-700 text-white",
  };

  const variant = config.variant ?? "info";

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        {/* Top colour bar */}
        <div className={`h-1.5 ${variant === "success" ? "bg-green-400" : variant === "danger" ? "bg-red-500" : "bg-purple-600"}`} />

        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 mt-0.5">{iconMap[variant]}</div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">{config.title}</h3>
              <p className="text-gray-500 text-sm mt-1">{config.message}</p>
            </div>
            {config.type === "alert" && (
              <button onClick={onClose} className="ml-auto flex-shrink-0 p-1 text-gray-400 hover:text-gray-600">
                <FaTimes />
              </button>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            {config.type === "confirm" && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition text-sm"
              >
                {config.cancelLabel ?? "Cancel"}
              </button>
            )}
            <button
              onClick={() => {
                config.onConfirm?.();
                onClose();
              }}
              className={`px-4 py-2 rounded-xl font-semibold transition text-sm ${buttonMap[variant]}`}
            >
              {config.confirmLabel ?? "OK"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
