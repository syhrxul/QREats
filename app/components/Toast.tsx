import { X, CheckCircle, AlertCircle } from 'lucide-react';

export default function ToastContainer({ toasts, removeToast }: { toasts: any[], removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-3 p-4 rounded-2xl shadow-xl ${t.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {t.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="text-sm font-bold">{t.message}</span>
          <button onClick={() => removeToast(t.id)}><X className="w-4 h-4 opacity-50" /></button>
        </div>
      ))}
    </div>
  );
}
