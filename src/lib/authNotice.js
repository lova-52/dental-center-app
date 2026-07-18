/* File: src/lib/authNotice.js */

const AUTH_NOTICE_KEY = 'psd_auth_notice';

export const setAuthNotice = (message) => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    AUTH_NOTICE_KEY,
    JSON.stringify({
      message,
      createdAt: new Date().toISOString(),
    })
  );
};

export const getAuthNotice = () => {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(AUTH_NOTICE_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearAuthNotice = () => {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(AUTH_NOTICE_KEY);
};