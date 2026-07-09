const DEFAULT_BACKEND_URL =
  process.env.REACT_APP_AI_BACKEND_URL || 'http://localhost:4000';

function getApiBaseUrl() {
  return String(DEFAULT_BACKEND_URL || '').replace(/\/+$/, '');
}

function safeParseJSON(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function getStoredSessionId() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('dental_ai_session_id') || '';
}

export function setStoredSessionId(sessionId) {
  if (typeof window === 'undefined') return;
  const value = String(sessionId || '').trim();
  if (value) {
    localStorage.setItem('dental_ai_session_id', value);
  }
}

export function clearStoredSessionId() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('dental_ai_session_id');
}

export function getStoredChatMessages() {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('dental_ai_chat_messages');
  if (!raw) return [];
  const parsed = safeParseJSON(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function setStoredChatMessages(messages) {
  if (typeof window === 'undefined') return;
  if (!Array.isArray(messages) || messages.length === 0) {
    localStorage.removeItem('dental_ai_chat_messages');
    return;
  }
  localStorage.setItem('dental_ai_chat_messages', JSON.stringify(messages));
}

export function clearStoredChatMessages() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('dental_ai_chat_messages');
}

export function getStoredChatOpen() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('dental_ai_chat_open') === 'true';
}

export function setStoredChatOpen(isOpen) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('dental_ai_chat_open', String(Boolean(isOpen)));
}

export async function sendAIChat({
  message,
  history = [],
  context = '',
  sessionId = '',
}) {
  const apiBaseUrl = getApiBaseUrl();

  const response = await fetch(`${apiBaseUrl}/api/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      history,
      context,
      sessionId,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.success) {
    const errorMessage =
      data?.error || `AI backend trả lỗi (${response.status || 'unknown'})`;
    throw new Error(errorMessage);
  }

  return {
    sessionId: data.sessionId || sessionId || '',
    answer: String(data.answer || data.reply || '').trim(),
    toolExecution: data.toolExecution || null,
    memory: data.memory || null,
    usage: data.usage || null,
    raw: data,
  };
}