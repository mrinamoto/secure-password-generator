import { CheckCircle2, Info } from 'lucide-react';

export default function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      {toast.type === 'info' ? <Info size={18} /> : <CheckCircle2 size={18} />}
      <span>{toast.message}</span>
    </div>
  );
}
