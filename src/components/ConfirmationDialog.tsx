import React, { useEffect, useId, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    if (!dialog.open) dialog.showModal();
    cancelRef.current?.focus();
    return () => { if (dialog.open) dialog.close(); };
  }, [isOpen]);
  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="field-dialog rounded-xl bg-white shadow-xl"
      onCancel={event => { event.preventDefault(); if (!isLoading) onCancel(); }}
      onClick={event => { if (event.target === event.currentTarget && !isLoading) onCancel(); }}
      aria-labelledby={titleId}
      aria-describedby={messageId}
    >
      <div className="w-full max-w-md app-card bg-white overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header with icon */}
        <div className="p-5 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${isDestructive ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-[#B9E6F5]/40 text-[#152128] border border-[#6990FF]/30'}`}>
              <AlertTriangle className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h3 id={titleId} className="text-base sm:text-lg font-brand font-bold text-[#152128] leading-snug">
                {title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="p-2 -mr-1 -mt-1 text-[#152128]/50 hover:text-[#152128] rounded-lg touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <div className="px-5 py-2">
          <p id={messageId} className="text-sm text-[#152128]/80 leading-relaxed font-normal">
            {message}
          </p>
        </div>

        {/* Actions - Glove friendly buttons */}
        <div className="p-4 sm:p-5 pt-4 bg-[#F4F6F8] border-t border-[#152128]/10 flex flex-col sm:flex-row-reverse gap-2.5">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-lg font-bold text-sm min-h-[44px] flex items-center justify-center gap-2 transition-colors touch-manipulation active:scale-[0.98] cursor-pointer shadow-sm ${
              isDestructive
                ? 'bg-[#E11D48] hover:bg-[#BE123C] text-white focus:ring-4 focus:ring-rose-200'
                : 'bg-[#6990FF] hover:bg-[#527AE8] text-[#152128] focus:ring-4 focus:ring-[#6990FF]/25'
            } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{confirmLabel}</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
          <button
            type="button"
            ref={cancelRef}
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg font-bold text-sm min-h-[44px] bg-white border border-[#152128]/20 text-[#152128] hover:bg-[#F4F6F8] hover:text-[#152128] transition-colors touch-manipulation active:scale-[0.98] cursor-pointer"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
};
