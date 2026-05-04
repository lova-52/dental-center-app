import React, { useState } from "react";

export default function EnableNotification() {
  const [loading, setLoading] = useState(false);

  const enableNotification = async () => {
    try {
      const OneSignal = window.OneSignal;

      if (!OneSignal?.Notifications) {
        alert("OneSignal chưa sẵn sàng.");
        return;
      }

      if (!OneSignal.Notifications.isPushSupported()) {
        alert("Trình duyệt này không hỗ trợ thông báo đẩy.");
        return;
      }

      if (OneSignal.Notifications.permission) {
        alert("Thông báo đã được bật rồi.");
        return;
      }

      setLoading(true);

      await OneSignal.Notifications.requestPermission();

      if (OneSignal.Notifications.permission) {
        alert("Đã bật thông báo!");
      } else {
        alert("Bạn chưa cho phép thông báo.");
      }
    } catch (error) {
      console.error("Enable notification error:", error);
      alert("Không mở được hộp thoại thông báo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={enableNotification}
      disabled={loading}
      className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-60"
    >
      {loading ? "Đang bật..." : "🔔 Bật thông báo"}
    </button>
  );
}