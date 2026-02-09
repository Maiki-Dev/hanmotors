import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, status = 'info', duration = 3000 }) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, title, description, status, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto flex w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-300 ease-in-out transform translate-y-0 opacity-100
              ${t.status === 'success' ? 'border-l-4 border-green-500' : ''}
              ${t.status === 'error' ? 'border-l-4 border-red-500' : ''}
              ${t.status === 'warning' ? 'border-l-4 border-yellow-500' : ''}
              ${t.status === 'info' ? 'border-l-4 border-blue-500' : ''}
            `}
          >
            <div className="p-4 flex items-start gap-3">
              <div className="flex-shrink-0">
                {t.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {t.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                {t.status === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                {t.status === 'info' && <Info className="h-5 w-5 text-blue-500" />}
              </div>
              <div className="flex-1 w-0 pt-0.5">
                <p className="text-sm font-medium text-gray-900">{t.title}</p>
                {t.description && (
                  <p className="mt-1 text-sm text-gray-500">{t.description}</p>
                )}
              </div>
              <div className="flex-shrink-0 ml-4 flex">
                <button
                  className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={() => removeToast(t.id)}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
