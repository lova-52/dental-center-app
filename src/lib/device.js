// src/lib/device.js

const DEVICE_ID_KEY = 'psd_device_id';

export const getOrCreateDeviceId = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const existing =
    window.localStorage.getItem(DEVICE_ID_KEY);

  if (existing) {
    return existing;
  }

  const newId =
    typeof crypto !== 'undefined' &&
    crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  window.localStorage.setItem(
    DEVICE_ID_KEY,
    newId
  );

  return newId;
};


const detectDeviceType = (ua) => {
  // iPad có thể gửi Macintosh trong một số trường hợp.
  const isIPad =
    /iPad/i.test(ua) ||
    (/Macintosh/i.test(ua) &&
      typeof navigator !== 'undefined' &&
      navigator.maxTouchPoints > 1);

  if (isIPad) {
    return 'tablet';
  }

  if (
    /Android/i.test(ua) &&
    !/Mobile/i.test(ua)
  ) {
    return 'tablet';
  }

  if (
    /Android/i.test(ua) ||
    /iPhone/i.test(ua) ||
    /iPod/i.test(ua)
  ) {
    return 'mobile';
  }

  return 'desktop';
};


const detectOS = (ua) => {
  if (/Windows NT 10/i.test(ua)) {
    return 'Windows';
  }

  if (/Windows NT 6.3/i.test(ua)) {
    return 'Windows 8.1';
  }

  if (/Windows NT 6.2/i.test(ua)) {
    return 'Windows 8';
  }

  if (/Windows NT 6.1/i.test(ua)) {
    return 'Windows 7';
  }

  if (/Android/i.test(ua)) {
    return 'Android';
  }

  if (
    /iPhone|iPad|iPod/i.test(ua)
  ) {
    return 'iOS/iPadOS';
  }

  if (/Mac OS X|Macintosh/i.test(ua)) {
    return 'macOS';
  }

  if (/Linux/i.test(ua)) {
    return 'Linux';
  }

  return 'Không xác định';
};


const detectBrowser = (ua) => {
  if (/Edg\//i.test(ua)) {
    return 'Microsoft Edge';
  }

  if (/OPR\//i.test(ua)) {
    return 'Opera';
  }

  if (/Firefox\//i.test(ua)) {
    return 'Mozilla Firefox';
  }

  if (/CriOS\//i.test(ua)) {
    return 'Google Chrome';
  }

  if (/Chrome\//i.test(ua)) {
    return 'Google Chrome';
  }

  if (
    /Safari\//i.test(ua) &&
    !/Chrome\//i.test(ua) &&
    !/CriOS\//i.test(ua)
  ) {
    return 'Safari';
  }

  return 'Trình duyệt';
};


const getDeviceName = (
  deviceType,
  osName
) => {
  if (deviceType === 'mobile') {
    if (osName === 'iOS/iPadOS') {
      return 'iPhone';
    }

    if (osName === 'Android') {
      return 'Điện thoại Android';
    }

    return 'Điện thoại';
  }

  if (deviceType === 'tablet') {
    if (osName === 'iOS/iPadOS') {
      return 'iPad';
    }

    return 'Máy tính bảng';
  }

  if (osName === 'macOS') {
    return 'Mac';
  }

  if (osName === 'Windows') {
    return 'Máy tính Windows';
  }

  if (osName === 'Linux') {
    return 'Máy tính Linux';
  }

  return 'Máy tính';
};


export const getDeviceInfo = () => {
  if (
    typeof navigator === 'undefined'
  ) {
    return {
      deviceId: '',
      deviceType: 'unknown',
      deviceName: 'Thiết bị không xác định',
      osName: 'Không xác định',
      browserName: 'Không xác định',
    };
  }

  const ua =
    navigator.userAgent || '';

  const deviceType =
    detectDeviceType(ua);

  const osName =
    detectOS(ua);

  const browserName =
    detectBrowser(ua);

  const deviceName =
    getDeviceName(
      deviceType,
      osName
    );

  return {
    deviceId:
      getOrCreateDeviceId(),

    deviceType,

    deviceName,

    osName,

    browserName,
  };
};


export const getDeviceLabel = () => {
  const info =
    getDeviceInfo();

  return [
    info.deviceName,
    info.osName,
    info.browserName,
  ]
    .filter(Boolean)
    .join(' · ');
};