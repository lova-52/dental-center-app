import React from "react";

export default function EnableNotification() {

  const enableNotification = async () => {
    if (!window.OneSignal) return;

    const permission = await window.OneSignal.Notifications.requestPermission();

    if (permission === "granted") {
      alert("Đã bật thông báo!");
    } else {
      alert("Bạn chưa cho phép thông báo.");
    }
  };

  return (
    <button
      onClick={enableNotification}
      className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:opacity-90"
    >
      🔔 Bật thông báo
    </button>
  );
}