import { createContext, useContext } from 'react';

export type ToastKind = 'info' | 'success';

export const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

export const useToast = () => useContext(ToastContext);
