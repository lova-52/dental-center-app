import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  Trash2,
  Loader2,
  MessageSquareMore,
  ChevronDown,
} from 'lucide-react';
import {
  clearStoredChatMessages,
  clearStoredSessionId,
  getStoredChatMessages,
  getStoredChatOpen,
  getStoredSessionId,
  sendAIChat,
  setStoredChatMessages,
  setStoredChatOpen,
  setStoredSessionId,
} from '../services/aiApi';

const QUICK_PROMPTS = [
  'Khách Nguyễn Văn A còn bảo hành không?',
  'Hôm nay có lịch hẹn không?',
  'Tìm khách theo số điện thoại 0909',
];

function generateSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createMessage(role, content) {
  return {
    id: `${role}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoResizeKey, setAutoResizeKey] = useState(0);

  const endRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const storedSessionId = getStoredSessionId();

    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = generateSessionId();
      setStoredSessionId(newSessionId);
      setSessionId(newSessionId);
    }

    setIsOpen(getStoredChatOpen());

    const storedMessages = getStoredChatMessages();
    if (Array.isArray(storedMessages) && storedMessages.length > 0) {
      setMessages(
        storedMessages
          .filter((m) => m && typeof m === 'object')
          .map((m) => ({
            id: m.id || `${m.role}_${Date.now()}`,
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content || ''),
            createdAt: m.createdAt || new Date().toISOString(),
          }))
      );
    }
  }, []);

  useEffect(() => {
    setStoredChatOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    setStoredChatMessages(messages);
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [input, autoResizeKey]);

  const clearChat = () => {
    setMessages([]);
    setInput('');
    setError('');
    clearStoredChatMessages();
    clearStoredSessionId();
    const newSessionId = generateSessionId();
    setStoredSessionId(newSessionId);
    setSessionId(newSessionId);
  };

  const appendAssistantFallback = (text) => {
    setMessages((prev) => [...prev, createMessage('assistant', text)]);
  };

  const sendMessage = async (customText = null) => {
    const text = String(customText ?? input).trim();
    if (!text || loading) return;

    const userMessage = createMessage('user', text);
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const result = await sendAIChat({
        message: text,
        history: nextMessages.slice(-20).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        context: '',
        sessionId,
      });

      if (result.sessionId && result.sessionId !== sessionId) {
        setSessionId(result.sessionId);
        setStoredSessionId(result.sessionId);
      }

      const answer = result.answer || 'Không có phản hồi từ AI.';
      setMessages((prev) => [...prev, createMessage('assistant', answer)]);
    } catch (err) {
      const message = err?.message || 'Không kết nối được với AI backend.';
      appendAssistantFallback(message);
      setError(message);
    } finally {
      setLoading(false);
      setAutoResizeKey((v) => v + 1);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const lastAssistantMessage = useMemo(() => {
    const reversed = [...messages].reverse();
    return reversed.find((m) => m.role === 'assistant') || null;
  }, [messages]);

  return (
    <>
      {isOpen ? (
        <div className="fixed bottom-4 right-4 z-[80] w-[min(92vw,420px)] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-primary/10 via-white to-emerald-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Phương Sen AI
                  </h3>
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <p className="text-xs text-gray-500">
                  Trợ lý nội bộ cho nha khoa
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label="Xóa cuộc trò chuyện"
                title="Xóa cuộc trò chuyện"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label="Thu gọn"
                title="Thu gọn"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] min-h-[360px] overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-600">
                  Hãy hỏi về khách hàng, lịch hẹn, điều trị, dịch vụ hoặc vật tư.
                </div>

                <div className="grid gap-2">
                  {QUICK_PROMPTS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => sendMessage(item)}
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-700 transition hover:border-primary/30 hover:bg-primary/5"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                          isUser
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {msg.content}
                        </div>
                        <div
                          className={`mt-1 text-[11px] ${
                            isUser ? 'text-white/70' : 'text-gray-400'
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex justify-start">
                    <div className="flex max-w-[85%] items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-600 shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang trả lời...
                    </div>
                  </div>
                )}

                <div ref={endRef} />
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 bg-white px-4 py-3">
            {error ? (
              <div className="mb-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}

            {lastAssistantMessage ? (
              <div className="mb-2 text-[11px] text-gray-400">
                Phản hồi gần nhất đã sẵn sàng.
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi..."
                rows={1}
                className="max-h-[140px] min-h-[44px] flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary focus:bg-white"
              />

              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="inline-flex h-[44px] items-center justify-center rounded-2xl bg-primary px-4 text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Gửi"
                title="Gửi"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-[11px] text-gray-400">
              Enter để gửi, Shift+Enter để xuống dòng.
            </p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-[80] inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-white shadow-xl transition hover:scale-[1.02] hover:shadow-2xl"
          aria-label="Mở Phương Sen AI"
        >
          <MessageSquareMore className="h-4 w-4" />
          <span className="text-sm font-medium">AI</span>
        </button>
      )}
    </>
  );
};

export default AIChatWidget;