import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Lock, ShieldCheck, Check, Building2 } from 'lucide-react';
import { Button } from '../common/Button';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { FundingApplication, DealMessage } from '../../types';

interface DealChatModalProps {
  application: FundingApplication;
  currentUserRole?: 'entrepreneur' | 'investor';
  currentUserId?: string;
  onClose: () => void;
}

export const DealChatModal: React.FC<DealChatModalProps> = ({
  application,
  currentUserRole = 'entrepreneur',
  currentUserId,
  onClose,
}) => {
  const [messages, setMessages] = useState<DealMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const data = await api.getDealMessages(application.id);
      setMessages(data || []);
    } catch (err: any) {
      console.warn('Fetch deal messages note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initial message load
    fetchMessages();

    // 2. Connect to Socket.IO real-time channel
    const socket = getSocket();
    setIsSocketConnected(socket.connected);

    const onConnect = () => setIsSocketConnected(true);
    const onDisconnect = () => setIsSocketConnected(false);

    // Join dedicated room for this specific deal application
    socket.emit('join_deal_room', { application_id: application.id });

    // Real-time instant incoming message handler
    const onNewMessage = (newMsg: DealMessage) => {
      if (newMsg && (newMsg.application_id === application.id || !newMsg.application_id)) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('deal_message', onNewMessage);

    // Background safety poll (every 10s fallback)
    const interval = setInterval(fetchMessages, 10000);

    return () => {
      socket.emit('leave_deal_room', { application_id: application.id });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('deal_message', onNewMessage);
      clearInterval(interval);
    };
  }, [application.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);
    try {
      const newMsg = await api.sendDealMessage(application.id, trimmed);
      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
    } catch (err: any) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const counterpartName =
    currentUserRole === 'entrepreneur'
      ? application.investor?.full_name || 'Designated Investor'
      : application.entrepreneur?.full_name || application.business?.name || 'Entrepreneur';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col h-[85vh] max-h-[700px] border border-gray-100 overflow-hidden">
        {/* Deal Room Header */}
        <div className="px-5 py-3.5 bg-[#101828] text-white flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-accent/20 flex items-center justify-center text-teal-accent">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {application.business?.name || 'SME Deal Room'}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Accepted
                </span>
                <span
                  title={isSocketConnected ? 'Realtime Socket.IO connected' : 'Connecting to Socket.IO...'}
                  className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-xs transition-colors ${
                    isSocketConnected
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSocketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  {isSocketConnected ? 'Socket.IO Live' : 'Connecting...'}
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Direct planning with <span className="font-semibold text-white">{counterpartName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WhatsApp-Style Certified Encryption Header (Mandatory Issue 5) */}
        <div className="bg-[#FEFCE8] border-b border-amber-200/80 px-4 py-2 flex items-center justify-center gap-2 text-center shadow-xs">
          <Lock className="w-3.5 h-3.5 text-amber-800 shrink-0" />
          <span className="text-xs font-semibold text-amber-900">
            Certified by SharkBridge, end-to-end encryption
          </span>
        </div>

        {/* Financial Deal Terms Context Bar */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-3">
            <span>
              Target Capital:{' '}
              <strong className="text-gray-900">
                ₹{application.amount_requested_inr.toLocaleString()}
              </strong>
            </span>
            {application.equity_stake_pct != null && (
              <span>
                Equity Offered:{' '}
                <strong className="text-teal-dark">{application.equity_stake_pct}%</strong>
              </span>
            )}
          </div>
          <span className="text-gray-500 text-[11px]">
            {application.business?.sector} • {application.business?.location || 'India'}
          </span>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAFC]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              Loading secure deal conversation...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-sm text-gray-900">Deal Room Active</h4>
              <p className="text-xs text-gray-500 max-w-sm">
                This direct channel is unlocked because the investor marked this proposal as interested.
                Begin discussing due diligence, timeline, terms, or next steps.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine =
                (currentUserId && msg.sender_id === currentUserId) ||
                (msg.sender_role && msg.sender_role === currentUserRole);

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-gray-700">
                      {isMine ? 'You' : msg.sender_name || 'Participant'}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                        msg.sender_role === 'investor'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {msg.sender_role === 'investor' ? 'Investor' : 'Entrepreneur'}
                    </span>
                  </div>

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed whitespace-pre-wrap ${
                      isMine
                        ? 'bg-[#101828] text-white rounded-br-xs'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-bl-xs'
                    }`}
                  >
                    {msg.content}
                    <div
                      className={`text-[9px] mt-1 text-right flex items-center justify-end gap-1 ${
                        isMine ? 'text-gray-400' : 'text-gray-400'
                      }`}
                    >
                      <span>
                        {msg.created_at
                          ? new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Just now'}
                      </span>
                      {isMine && <Check className="w-2.5 h-2.5 text-teal-accent" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="px-4 py-1.5 bg-red-50 text-[11px] text-red-700 border-t border-red-200">
            {error}
          </div>
        )}

        {/* Message Input Box */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-white border-t border-gray-200 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message for deal planning, terms, questions..."
            disabled={sending}
            className="flex-1 text-xs rounded-xl border border-gray-300 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#101828]/20 focus:border-[#101828] bg-gray-50/50"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!inputText.trim() || sending}
            isLoading={sending}
            className="px-4 py-2.5"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
};
