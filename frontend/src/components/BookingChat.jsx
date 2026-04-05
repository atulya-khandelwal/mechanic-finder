import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { bookings } from '../api';
import { useAuth } from '../context/AuthContext';

const POLL_ACTIVE_MS = 4000;
const POLL_HISTORY_MS = 15000;

/**
 * User ↔ mechanic messaging for a booking.
 * Sending is allowed only while status is accepted or in_progress.
 * After completed/cancelled, messages are shown read-only.
 */
export default function BookingChat({ bookingId, otherPartyName, status, viewerRole = 'user' }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const canSend = useMemo(() => ['accepted', 'in_progress'].includes(status), [status]);
  const isPending = status === 'pending';
  const isReadOnly = ['completed', 'cancelled', 'rejected'].includes(status);

  const fetchMessages = useCallback(() => {
    if (!bookingId) return;
    bookings
      .messages(bookingId)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId || isPending) return undefined;

    fetchMessages();

    const intervalMs = canSend ? POLL_ACTIVE_MS : isReadOnly ? POLL_HISTORY_MS : null;
    if (intervalMs == null) return undefined;

    const timer = setInterval(fetchMessages, intervalMs);
    return () => clearInterval(timer);
  }, [bookingId, status, canSend, isReadOnly, isPending, fetchMessages]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && bookingId && !isPending) fetchMessages();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [bookingId, isPending, fetchMessages]);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || !canSend) return;
    setSending(true);
    try {
      const sent = await bookings.sendMessage(bookingId, text);
      setMessages((prev) => [...prev, sent]);
      setInput('');
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  if (isPending) {
    return (
      <div className="booking-chat booking-chat-pending">
        <h4>Messages</h4>
        <p className="chat-pending-note">
          {viewerRole === 'mechanic' ? (
            <>
              <strong>Accept this job</strong> using the buttons above to start messaging the customer. Chat stays open until the job is marked complete.
            </>
          ) : (
            <>
              Chat opens when the mechanic <strong>accepts</strong> your request. You can message each other from then until the job is <strong>completed</strong>.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className={`booking-chat ${isReadOnly ? 'booking-chat-readonly' : ''}`}>
      <div className="booking-chat-header">
        <h4>Messages</h4>
        {canSend && (
          <span className="chat-live-badge" title="Messages sync while you keep this open">
            Live
          </span>
        )}
        {isReadOnly && (
          <span className="chat-ended-badge">Chat closed</span>
        )}
      </div>
      {isReadOnly && (
        <p className="chat-readonly-hint">
          This job has ended. You can read the conversation below; new messages are not allowed.
        </p>
      )}
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 ? (
          <p className="chat-empty">
            {canSend ? 'No messages yet. Coordinate arrival, parts, or questions here.' : 'No messages in this thread.'}
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`chat-bubble ${m.sender_id === user?.id ? 'mine' : 'theirs'}`}
            >
              <span className="chat-sender">{m.sender_name}</span>
              <span className="chat-text">{m.message}</span>
              <span className="chat-time">
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
      {canSend ? (
        <form onSubmit={handleSend} className="chat-form">
          <input
            type="text"
            placeholder={`Message ${otherPartyName}…`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            disabled={sending}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary" disabled={!input.trim() || sending}>
            {sending ? '…' : 'Send'}
          </button>
        </form>
      ) : (
        isReadOnly && <p className="chat-readonly-footer">Messaging was available from acceptance through job completion.</p>
      )}
    </div>
  );
}
