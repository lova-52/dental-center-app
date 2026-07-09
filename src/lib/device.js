// File: src/lib/device.js

const DEVICE_ID_KEY = 'psd_device_id';

export const getOrCreateDeviceId = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const existing = window.localStorage.getItem(DEVICE_ID_KEY);

  if (existing) {
    return existing;
  }

  const newId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(DEVICE_ID_KEY, newId);

  return newId;
};

export const getDeviceLabel = () => {
  if (typeof navigator === 'undefined') {
    return 'unknown-device';
  }

  const ua = navigator.userAgent || 'unknown-device';

  return ua.length > 180 ? ua.slice(0, 180) : ua;
};