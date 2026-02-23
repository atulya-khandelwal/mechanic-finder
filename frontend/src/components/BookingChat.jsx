import { useState, useEffect, useRef } from 'react';
import { bookings } from '../api';
import { useAuth } from '../context/AuthContext';

const POLL_INTERVAL = 3000; // 3 seconds

export default function BookingChat({ bookingId, otherPartyName }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const fetchMessages = () => {
    if (!bookingId) return;
    bookings.messages(bookingId)
      .then(setMessages)
      .catch(() => setMessages([]));
  };

  useEffect(() => {
    fetchMessages();
    const timer = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [bookingId]);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
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

  return (
    <div className="booking-chat">
      <h4>Chat with {otherPartyName}</h4>
      <div className="chat-messages" ref={listRef}>
        {loading ? (
          <p className="chat-loading">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="chat-empty">No messages yet. Say hi!</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`chat-bubble ${m.sender_id === user?.id ? 'mine' : 'theirs'}`}
            >
              <span className="chat-sender">{m.sender_name}</span>
              <span className="chat-text">{m.message}</span>
              <span className="chat-time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSend} className="chat-form">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          disabled={sending}
        />
        <button type="submit" className="btn btn-primary" disabled={!input.trim() || sending}>
          Send
        </button>
      </form>
    </div>
  );
}
