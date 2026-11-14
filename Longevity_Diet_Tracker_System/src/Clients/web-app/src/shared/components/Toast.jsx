
import React, { useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';

export default function Toast({ toast, onClose }) {

  // Auto close after 4 seconds
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      onClose?.();
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  // Always call hooks before conditional return
  if (!toast) return null;

  const toastStyles = {
    success: {
      wrapper: 'border-[#DCE9DC] bg-[#FAFCF8]',
      iconBox: 'bg-[#E7F1E5] text-[#47764C]',
      title: 'text-[#47764C]',
      message: 'text-[#344A37]',
      icon: CheckCircle2,
    },

    warning: {
      wrapper: 'border-[#EFE3CD] bg-[#FFFCF6]',
      iconBox: 'bg-[#F7EEDC] text-[#A87935]',
      title: 'text-[#A87935]',
      message: 'text-[#655039]',
      icon: AlertCircle,
    },

    info: {
      wrapper: 'border-[#DFE6E0] bg-[#FAFCFA]',
      iconBox: 'bg-[#EAF0EA] text-[#58745C]',
      title: 'text-[#58745C]',
      message: 'text-[#3F4D40]',
      icon: Info,
    },
  };

  const type = toastStyles[toast.type] ? toast.type : 'info';
  const style = toastStyles[type];
  const IconComponent = style.icon;

  return (
    <div
      role={type === 'warning' ? 'alert' : 'status'}
      aria-live={type === 'warning' ? 'assertive' : 'polite'}
      className="fixed bottom-5 right-5 z-[100] w-[calc(100%-40px)] max-w-[390px] animate-fade-in sm:bottom-7 sm:right-7"
    >
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 shadow-[0_12px_40px_rgba(35,55,35,0.09)] backdrop-blur-xl ${style.wrapper}`}
      >
        {/* Icon */}
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.iconBox}`}
        >
          <IconComponent size={19} strokeWidth={2} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 pt-0.5">
          <p
            className={`text-[10px] font-bold uppercase tracking-[0.12em] ${style.title}`}
          >
            {toast.title || 'Thông báo'}
          </p>

          <p
            className={`mt-1 text-[12px] font-medium leading-relaxed ${style.message}`}
          >
            {toast.message}
          </p>
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={() => onClose?.()}
          aria-label="Đóng thông báo"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#A0A79B] transition-colors hover:bg-black/5 hover:text-[#445044]"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
