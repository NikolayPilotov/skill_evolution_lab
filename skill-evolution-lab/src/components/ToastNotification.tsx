import { CheckCircle2, X } from "lucide-react";

type ToastNotificationProps = {
  title: string;
  copy: string;
  time: string;
  onDismiss: () => void;
};

export function ToastNotification({ title, copy, time, onDismiss }: ToastNotificationProps) {
  return (
    <article className="notification-card toast-card">
      <div className="card-label">01 / Toast</div>
      <div className="toast-inner">
        <div className="notice-icon green"><CheckCircle2 size={18} /></div>
        <div className="notice-content">
          <div className="notice-meta"><span>Toast</span><time>{time}</time></div>
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
        <button className="dismiss" onClick={onDismiss} aria-label="Dismiss Toast example"><X size={16} /></button>
        <div className="toast-tail" />
      </div>
    </article>
  );
}
