import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, ChevronDown } from 'lucide-react';
import logoImg from '../../assets/sharkbridge-logo.png';
import { api } from '../../lib/api';
import { AssistantChatMessage } from '../../types';

interface SharkAssistantProps {
  userRole?: 'entrepreneur' | 'investor' | string;
}

export const SharkAssistant: React.FC<SharkAssistantProps> = ({ userRole = 'entrepreneur' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content:
        `Hello! I'm **SharkBot**, your personal guide to the entire SharkBridge platform.\n\n` +
        `Whether you're an entrepreneur registering your business or an investor evaluating deals, I'm here to guide you step-by-step.\n\n` +
        `How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggested_actions: [
        'How do I create a business profile?',
        'How does the 100-pt matching rubric work?',
        'How does investor CV OCR verification work?',
        'How does Deal Planning Chat unlock?',
      ],
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const userMsg: AssistantChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await api.askAssistant(query, userRole);
      const assistantMsg: AssistantChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggested_actions: res.suggested_actions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: AssistantChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        content:
          `I encountered a temporary connection issue. Please check your connection or try again shortly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderFormattedContent = (content: string) => {
    // Basic Markdown parsing for bold, code, bullets
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Bold parsing
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={pIdx} className="bg-gray-100 text-teal-dark px-1 py-0.5 rounded text-[11px] font-mono">
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });

      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5">
            <span className="text-teal-dark font-bold">•</span>
            <div className="flex-1">{formattedLine}</div>
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="my-0.5">
          {formattedLine}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open SharkBridge Guide"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-[#101828] text-white shadow-xl hover:bg-gray-900 hover:scale-105 active:scale-95 transition-all group border border-teal-dark/30"
        >
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center p-0.5 shadow-sm">
            <img src={logoImg} alt="SharkBot" className="w-4 h-4 object-contain" />
          </div>
          <span className="text-xs font-semibold tracking-wide">SharkBridge Guide</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-accent"></span>
          </span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[92vw] sm:w-[400px] h-[550px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="bg-[#101828] text-white px-4 py-3 flex items-center justify-between border-b border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1 shadow-sm">
                <img src={logoImg} alt="SharkBot" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                  SharkBridge Guide
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-teal-accent/20 text-teal-accent uppercase font-bold tracking-wider">
                    AI Assistant
                  </span>
                </h3>
                <p className="text-[11px] text-gray-300">Ground truth knowledge of SharkBridge</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                title="Minimize Guide"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                title="Close Guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Platform Security Note */}
          <div className="bg-teal-50/60 border-b border-teal-100 px-3.5 py-1.5 flex items-center gap-1.5 text-[10px] text-teal-900 font-medium">
            <Sparkles className="w-3 h-3 text-teal-dark shrink-0" />
            <span>Ask me anything about profiles, matching, OCR, applications & deal chat!</span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#F8FAFC]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#101828] text-white rounded-br-xs'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-xs'
                  }`}
                >
                  {renderFormattedContent(msg.content)}
                  <div
                    className={`text-[9px] mt-1 text-right ${
                      msg.sender === 'user' ? 'text-gray-400' : 'text-gray-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {/* Suggested Prompt Chips */}
                {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[92%]">
                    {msg.suggested_actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(action)}
                        disabled={loading}
                        className="text-[11px] bg-white border border-gray-200 text-gray-700 hover:border-teal-dark hover:text-teal-dark px-2.5 py-1 rounded-full shadow-2xs hover:bg-teal-50/40 transition-all text-left"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-500 w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-dark animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-teal-dark animate-pulse delay-75" />
                <div className="w-1.5 h-1.5 rounded-full bg-teal-dark animate-pulse delay-150" />
                <span className="text-[11px] text-gray-500 ml-1">Searching platform guide...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask a question about SharkBridge..."
              disabled={loading}
              className="flex-1 text-xs rounded-xl border border-gray-300 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#101828]/20 focus:border-[#101828] bg-gray-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2.5 rounded-xl bg-[#101828] text-white hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-[#101828] transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
