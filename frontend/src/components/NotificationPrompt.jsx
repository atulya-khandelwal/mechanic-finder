import { useState, useEffect } from 'react';
import { usePushSubscription } from '../hooks/usePushSubscription';

export default function NotificationPrompt() {
  const { status, errorMessage, subscribe } = usePushSubscription();
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem('push-prompt-dismissed'));

  useEffect(() => {
    if (status === 'subscribed' || status === 'denied') {
      localStorage.setItem('push-prompt-dismissed', '1');
      setDismissed(true);
    }
  }, [status]);

  if (dismissed || status === 'unsupported' || status === 'subscribed' || status === 'denied') return null;

  return (
    <div className="notification-prompt">
      <span>Enable notifications to get updates on your bookings</span>
      <button
        type="button"
        className="btn btn-primary"
        onClick={subscribe}
        disabled={status === 'subscribing'}
      >
        {status === 'subscribing' ? 'Enabling...' : status === 'error' ? 'Retry' : 'Enable'}
      </button>
      {errorMessage && <p className="notification-prompt-error">{errorMessage}</p>}
      <button type="button" className="notification-prompt-dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
