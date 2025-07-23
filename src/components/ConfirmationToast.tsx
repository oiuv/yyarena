'use client';

import React from 'react';
import toast from 'react-hot-toast';

interface ConfirmationToastProps {
  t: any; // toast object provided by react-hot-toast
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationToast: React.FC<ConfirmationToastProps> = ({ t, message, onConfirm, onCancel }) => {
  const handleConfirm = () => {
    onConfirm();
    toast.dismiss(t.id);
  };

  const handleCancel = () => {
    onCancel();
    toast.dismiss(t.id);
  };

  return (
    <div
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-brand-charcoal shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-brand-gold/50`}
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            {/* You can add a custom icon here if needed */}
            <svg className="h-6 w-6 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-brand-ivory">
              {message}
            </p>
          </div>
        </div>
      </div>
      <div className="flex border-l border-brand-gold/50">
        <button
          onClick={handleConfirm}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-brand-gold hover:text-brand-ivory hover:bg-brand-gold/20 focus:outline-none focus:ring-2 focus:ring-brand-gold"
        >
          确定
        </button>
        <button
          onClick={handleCancel}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-brand-red hover:text-brand-ivory hover:bg-brand-red/20 focus:outline-none focus:ring-2 focus:ring-brand-red"
        >
          取消
        </button>
      </div>
    </div>
  );
};

export default ConfirmationToast;