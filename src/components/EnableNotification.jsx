import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  Phone,
  User,
  X,
  RefreshCw,
  AlertCircle,
  Timer,
} from "lucide-react";

import { supabase } from "../lib/supabase";

import {
  normalizeTelesaleColor,
  getTelesaleColorStyle,
  getTelesaleDotStyle,
} from "../utils/telesaleColors";

/* =========================================================
   HELPERS
========================================================= */

const pad = (value) => String(value).padStart(2, "0");

const getDateKey = (date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
};

const getTomorrowKey = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getDateKey(tomorrow);
};

const formatDate = (dateString) => {
  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTime = (dateString) => {
  const date = new Date(dateString);

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatRelativeTime = (appointmentTime) => {
  const now = new Date();
  const target = new Date(appointmentTime);

  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return "Đã đến giờ";
  }

  const totalMinutes = Math.floor(diff / 60000);

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `Còn ${days} ngày${
      hours > 0 ? ` ${hours} giờ` : ""
    }`;
  }

  if (hours > 0) {
    return `Còn ${hours} giờ${
      minutes > 0 ? ` ${minutes} phút` : ""
    }`;
  }

  return `Còn ${Math.max(minutes, 1)} phút`;
};

const getUrgency = (appointmentTime) => {
  const now = new Date();
  const target = new Date(appointmentTime);

  const diffMinutes =
    (target.getTime() - now.getTime()) / 60000;

  if (diffMinutes <= 0) {
    return "past";
  }

  // Trong vòng 2 giờ
  if (diffMinutes <= 120) {
    return "critical";
  }

  // Hôm nay
  if (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate()
  ) {
    return "today";
  }

  // Ngày mai
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (
    target.getFullYear() === tomorrow.getFullYear() &&
    target.getMonth() === tomorrow.getMonth() &&
    target.getDate() === tomorrow.getDate()
  ) {
    return "tomorrow";
  }

  return "later";
};

/* =========================================================
   URGENCY STYLES
========================================================= */

const getUrgencyConfig = (urgency) => {
  switch (urgency) {
    case "critical":
      return {
        wrapper:
          "border-red-300 bg-gradient-to-r from-red-50 via-orange-50/70 to-white shadow-md shadow-red-100",
        leftBar: "bg-red-500",
        time:
          "border-red-200 bg-red-100 text-red-700",
        icon:
          "bg-red-100 text-red-600",
        badge:
          "border-red-200 bg-red-100 text-red-700",
        badgeText: "SẮP ĐẾN",
        dot: "bg-red-500",
        title: "text-red-900",
        relative: "text-red-600",
        pulse: true,
      };

    case "today":
      return {
        wrapper:
          "border-orange-300 bg-gradient-to-r from-orange-50 via-amber-50/60 to-white shadow-sm shadow-orange-100",
        leftBar: "bg-orange-400",
        time:
          "border-orange-200 bg-orange-100 text-orange-700",
        icon:
          "bg-orange-100 text-orange-600",
        badge:
          "border-orange-200 bg-orange-100 text-orange-700",
        badgeText: "HÔM NAY",
        dot: "bg-orange-500",
        title: "text-orange-950",
        relative: "text-orange-600",
        pulse: false,
      };

    /*
      =======================================================
      NGÀY MAI - BLUE 600
      =======================================================
    */
    case "tomorrow":
      return {
        wrapper:
          "border-blue-300 bg-gradient-to-r from-blue-50 via-sky-50/60 to-white shadow-sm shadow-blue-100",
        leftBar: "bg-blue-600",
        time:
          "border-blue-200 bg-blue-50 text-blue-700",
        icon:
          "bg-blue-100 text-blue-700",
        badge:
          "border-blue-200 bg-blue-100 text-blue-700",
        badgeText: "NGÀY MAI",
        dot: "bg-blue-600",
        title: "text-gray-900",
        relative: "text-blue-700",
        pulse: false,
      };

    default:
      return {
        wrapper:
          "border-slate-200 bg-white",
        leftBar: "bg-slate-300",
        time:
          "border-slate-200 bg-slate-50 text-slate-700",
        icon:
          "bg-slate-50 text-slate-500",
        badge:
          "border-slate-200 bg-slate-50 text-slate-500",
        badgeText: "",
        dot: "bg-slate-400",
        title: "text-gray-800",
        relative: "text-gray-500",
        pulse: false,
      };
  }
};

/* =========================================================
   APPOINTMENT ITEM
========================================================= */

const AppointmentItem = ({ appointment, isNearest }) => {
  const appointmentTime = appointment.appointment_time;
  const urgency = getUrgency(appointmentTime);
  const config = getUrgencyConfig(urgency);

  const customer = appointment.customers;

  const telesale =
    customer?.customer_telesales?.[0]?.telesales || null;

  const customerName =
    customer?.full_name ||
    appointment.customer_name ||
    "Khách hàng";

  const phone =
    customer?.phone ||
    appointment.phone ||
    "";

  const note =
    appointment.note ||
    appointment.notes ||
    "";

  const telesaleColor = normalizeTelesaleColor(
    telesale?.color
  );

  const telesaleStyle = getTelesaleColorStyle(
    telesaleColor
  );

  const telesaleDotStyle = getTelesaleDotStyle(
    telesaleColor
  );

  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl border transition-all duration-300",
        config.wrapper,
        isNearest
          ? "ring-1 ring-red-200"
          : "",
      ].join(" ")}
    >
      {/* Thanh ưu tiên bên trái */}
      <div
        className={[
          "absolute left-0 top-0 bottom-0 w-1",
          config.leftBar,
          config.pulse
            ? "animate-pulse"
            : "",
        ].join(" ")}
      />

      <div className="p-3 pl-4">
        {/* Hàng đầu */}
        <div className="flex items-start gap-2.5">
          {/* Giờ */}
          <div
            className={[
              "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold",
              config.time,
              urgency === "critical"
                ? "shadow-sm"
                : "",
            ].join(" ")}
          >
            <Clock className="h-3.5 w-3.5" />

            <span>
              {formatTime(appointmentTime)}
            </span>
          </div>

          {/* Nội dung */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <User
                className={[
                  "mt-0.5 h-3.5 w-3.5 shrink-0",
                  urgency === "critical"
                    ? "text-red-500"
                    : urgency === "today"
                    ? "text-orange-500"
                    : urgency === "tomorrow"
                    ? "text-blue-600"
                    : "text-slate-400",
                ].join(" ")}
              />

              <p
                className={[
                  "min-w-0 truncate text-sm font-semibold",
                  config.title,
                ].join(" ")}
                title={customerName}
              >
                {customerName}
              </p>
            </div>

            {phone && (
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                <Phone className="h-3 w-3 shrink-0" />

                <span>{phone}</span>
              </div>
            )}
          </div>

          {/* Badge mức độ */}
          {config.badgeText && (
            <div
              className={[
                "hidden shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold tracking-wide sm:flex",
                config.badge,
              ].join(" ")}
            >
              {config.pulse && (
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className={[
                      "absolute inline-flex h-full w-full rounded-full opacity-75",
                      config.dot,
                      "animate-ping",
                    ].join(" ")}
                  />

                  <span
                    className={[
                      "relative inline-flex h-1.5 w-1.5 rounded-full",
                      config.dot,
                    ].join(" ")}
                  />
                </span>
              )}

              {config.badgeText}
            </div>
          )}
        </div>

        {/* Thời gian còn lại */}
        {(urgency === "critical" ||
          urgency === "today") && (
          <div
            className={[
              "mt-2 flex items-center gap-1.5 text-[11px] font-semibold",
              config.relative,
            ].join(" ")}
          >
            <Timer className="h-3 w-3" />

            <span>
              {formatRelativeTime(
                appointmentTime
              )}
            </span>

            {isNearest && (
              <span className="font-bold">
                · LỊCH GẦN NHẤT
              </span>
            )}
          </div>
        )}

        {/* Telesale */}
        <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2">
          <span className="text-[9px] uppercase tracking-wider text-slate-400">
            Telesale
          </span>

          {telesale ? (
            <span
              className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
              style={telesaleStyle}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={telesaleDotStyle}
              />

              {telesale.name}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">
              Chưa phân công
            </span>
          )}
        </div>

        {/* Ghi chú */}
        {note && (
          <div className="mt-2 truncate border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            {note}
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================================================
   DATE GROUP
========================================================= */

const DateGroup = ({
  dateKey,
  appointments,
  nearestAppointmentId,
}) => {
  const date = new Date(
    `${dateKey}T12:00:00`
  );

  const tomorrowKey = getTomorrowKey();

  const isTomorrow =
    dateKey === tomorrowKey;

  const hasTodayAppointment =
    appointments.some(
      (appointment) =>
        getUrgency(
          appointment.appointment_time
        ) === "today"
    );

  const hasCriticalAppointment =
    appointments.some(
      (appointment) =>
        getUrgency(
          appointment.appointment_time
        ) === "critical"
    );

  let headerClass =
    "border-b border-slate-100 bg-white";

  let iconClass =
    "bg-slate-100 text-slate-500";

  if (hasCriticalAppointment) {
    headerClass =
      "border-b border-red-100 bg-red-50/80";

    iconClass =
      "bg-red-100 text-red-600";
  } else if (hasTodayAppointment) {
    headerClass =
      "border-b border-orange-100 bg-orange-50/60";

    iconClass =
      "bg-orange-100 text-orange-600";
  } else if (isTomorrow) {
    /*
      Ngày mai - BLUE 600
    */
    headerClass =
      "border-b border-blue-200 bg-blue-50/70";

    iconClass =
      "bg-blue-100 text-blue-600";
  }

  return (
    <div>
      {/* Date header */}
      <div
        className={[
          "flex items-center justify-between gap-3 px-4 py-3",
          headerClass,
        ].join(" ")}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              iconClass,
            ].join(" ")}
          >
            {hasCriticalAppointment ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CalendarDays className="h-4 w-4" />
            )}
          </div>

          <div className="min-w-0">
            <p
              className={[
                "text-xs font-bold capitalize",
                hasCriticalAppointment
                  ? "text-red-900"
                  : hasTodayAppointment
                  ? "text-orange-900"
                  : isTomorrow
                  ? "text-blue-900"
                  : "text-gray-800",
              ].join(" ")}
            >
              {formatDate(dateKey)}
            </p>

            <p className="mt-0.5 text-[10px] text-gray-400">
              {hasCriticalAppointment
                ? "Lịch hẹn sắp tới"
                : hasTodayAppointment
                ? "Lịch hẹn trong hôm nay"
                : isTomorrow
                ? "Lịch hẹn ngày mai"
                : "Lịch hẹn tiếp theo"}
            </p>
          </div>
        </div>

        <span
          className={[
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
            hasCriticalAppointment
              ? "bg-red-100 text-red-700"
              : hasTodayAppointment
              ? "bg-orange-100 text-orange-700"
              : isTomorrow
              ? "bg-blue-100 text-blue-600"
              : "bg-slate-100 text-slate-500",
          ].join(" ")}
        >
          {appointments.length} lịch
        </span>
      </div>

      {/* Appointments */}
      <div className="space-y-2.5 bg-white p-3.5">
        {appointments.map(
          (appointment) => (
            <AppointmentItem
              key={appointment.id}
              appointment={appointment}
              isNearest={
                appointment.id ===
                nearestAppointmentId
              }
            />
          )
        )}
      </div>
    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function EnableNotification() {
  const [open, setOpen] = useState(false);
  const [appointments, setAppointments] =
    useState([]);
  const [loading, setLoading] =
    useState(false);
  const [lastUpdated, setLastUpdated] =
    useState(null);

  const fetchAppointments =
    useCallback(async () => {
      try {
        setLoading(true);

        const now = new Date();

        const { data, error } =
          await supabase
            .from("appointments")
            .select(`
              *,
              customers(
                full_name,
                phone,
                note,
                customer_telesales(
                  telesale_id,
                  telesales(
                    id,
                    name,
                    email,
                    color,
                    is_active
                  )
                )
              )
            `)
            .neq(
              "status",
              "cancelled"
            )
            .gte(
              "appointment_time",
              now.toISOString()
            )
            .order(
              "appointment_time",
              {
                ascending: true,
              }
            );

        if (error) {
          console.error(
            "Fetch upcoming appointments error:",
            error
          );

          return;
        }

        setAppointments(data || []);
        setLastUpdated(new Date());
      } catch (error) {
        console.error(
          "Fetch upcoming appointments error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchAppointments();

    // Cập nhật định kỳ để countdown và thứ tự luôn chính xác.
    const interval = setInterval(
      fetchAppointments,
      60000
    );

    return () =>
      clearInterval(interval);
  }, [fetchAppointments]);

  /* =======================================================
     GROUP BY DATE
  ======================================================= */

  const groupedAppointments =
    useMemo(() => {
      const groups = {};

      appointments.forEach(
        (appointment) => {
          const date = new Date(
            appointment.appointment_time
          );

          const key = getDateKey(date);

          if (!groups[key]) {
            groups[key] = [];
          }

          groups[key].push(appointment);
        }
      );

      return groups;
    }, [appointments]);

  const visibleDateKeys =
    useMemo(() => {
      const keys = Object.keys(
        groupedAppointments
      ).sort();

      /*
        Chỉ hiển thị tối đa 2 ngày gần nhất.

        Ví dụ:
        - Hôm nay có lịch
        - Ngày mai có lịch
        => Hôm nay + ngày mai

        Nếu hôm nay không có:
        => ngày gần nhất + ngày tiếp theo
      */
      return keys.slice(0, 2);
    }, [groupedAppointments]);

  /* =======================================================
     NEAREST APPOINTMENT
  ======================================================= */

  const nearestAppointment =
    appointments[0] || null;

  const nearestUrgency =
    nearestAppointment
      ? getUrgency(
          nearestAppointment.appointment_time
        )
      : null;

  const hasCriticalAppointment =
    nearestUrgency === "critical";

  const hasTodayAppointment =
    nearestUrgency === "today";

  const hasTomorrowAppointment =
    appointments.some(
      (appointment) =>
        getUrgency(
          appointment.appointment_time
        ) === "tomorrow"
    );

  /* =======================================================
     HEADER STYLE
  ======================================================= */

  let headerStyle =
    "border-slate-200 bg-white";

  let headerIconStyle =
    "bg-primary/10 text-primary";

  let headerTitleStyle =
    "text-gray-900";

  if (hasCriticalAppointment) {
    headerStyle =
      "border-red-300 bg-gradient-to-r from-red-50 via-orange-50 to-white shadow-md shadow-red-100";

    headerIconStyle =
      "bg-red-100 text-red-600";

    headerTitleStyle =
      "text-red-900";
  } else if (hasTodayAppointment) {
    headerStyle =
      "border-orange-300 bg-gradient-to-r from-orange-50 via-amber-50 to-white shadow-sm shadow-orange-100";

    headerIconStyle =
      "bg-orange-100 text-orange-600";

    headerTitleStyle =
      "text-orange-900";
  } else if (hasTomorrowAppointment) {
    /*
      Ngày mai - BLUE 600
    */
    headerStyle =
      "border-blue-300 bg-gradient-to-r from-blue-50 via-sky-50 to-white shadow-sm shadow-blue-100";

    headerIconStyle =
      "bg-blue-100 text-blue-600";

    headerTitleStyle =
      "text-blue-900";
  }

  return (
    <div className="w-full">
      {/* ===================================================
          COLLAPSED BUTTON
      =================================================== */}

      <button
        type="button"
        onClick={() =>
          setOpen((value) => !value)
        }
        className={[
          "group flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all duration-300",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          headerStyle,
          open
            ? "rounded-b-none"
            : "",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={[
              "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
              headerIconStyle,
            ].join(" ")}
          >
            {hasCriticalAppointment && (
              <span className="absolute inset-0 rounded-xl bg-red-400/20 animate-ping" />
            )}

            <Bell className="relative h-5 w-5" />

            {hasCriticalAppointment && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500 animate-pulse" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p
                className={[
                  "truncate text-sm font-bold",
                  headerTitleStyle,
                ].join(" ")}
              >
                Lịch hẹn sắp tới
              </p>

              {hasCriticalAppointment && (
                <span className="hidden rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold text-red-700 sm:inline-block">
                  SẮP ĐẾN
                </span>
              )}

              {hasTodayAppointment &&
                !hasCriticalAppointment && (
                  <span className="hidden rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-bold text-orange-700 sm:inline-block">
                    HÔM NAY
                  </span>
                )}
            </div>

            <p
              className={[
                "mt-0.5 text-xs",
                hasCriticalAppointment
                  ? "font-semibold text-red-600"
                  : hasTodayAppointment
                  ? "font-medium text-orange-600"
                  : hasTomorrowAppointment
                  ? "font-medium text-blue-600"
                  : "text-gray-500",
              ].join(" ")}
            >
              {nearestAppointment
                ? hasCriticalAppointment
                  ? formatRelativeTime(
                      nearestAppointment.appointment_time
                    )
                  : `${appointments.length} lịch hẹn sắp tới`
                : "Không có lịch hẹn sắp tới"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={[
              "flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[10px] font-bold",
              hasCriticalAppointment
                ? "bg-red-100 text-red-700"
                : hasTodayAppointment
                ? "bg-orange-100 text-orange-700"
                : hasTomorrowAppointment
                ? "bg-blue-100 text-blue-600"
                : "bg-slate-100 text-slate-600",
            ].join(" ")}
          >
            {appointments.length}
          </span>

          {open ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-y-0.5" />
          )}
        </div>
      </button>

      {/* ===================================================
          EXPANDED PANEL
      =================================================== */}

      {open && (
        <div
          className={[
            "overflow-hidden rounded-b-xl border border-t-0 shadow-sm",
            hasCriticalAppointment
              ? "border-red-200"
              : hasTodayAppointment
              ? "border-orange-200"
              : hasTomorrowAppointment
              ? "border-blue-200"
              : "border-slate-200",
          ].join(" ")}
        >
          {/* Panel header */}
          <div
            className={[
              "flex items-center justify-between border-b px-4 py-2.5",
              hasCriticalAppointment
                ? "border-red-100 bg-red-50"
                : hasTodayAppointment
                ? "border-orange-100 bg-orange-50/70"
                : hasTomorrowAppointment
                ? "border-blue-100 bg-blue-50/60"
                : "border-slate-100 bg-slate-50/70",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              {hasCriticalAppointment ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : hasTodayAppointment ? (
                <CalendarDays className="h-4 w-4 text-orange-600" />
              ) : hasTomorrowAppointment ? (
                <CalendarDays className="h-4 w-4 text-blue-600" />
              ) : (
                <CalendarDays className="h-4 w-4 text-primary" />
              )}

              <span
                className={[
                  "text-xs font-semibold",
                  hasCriticalAppointment
                    ? "text-red-800"
                    : hasTodayAppointment
                    ? "text-orange-800"
                    : hasTomorrowAppointment
                    ? "text-blue-800"
                    : "text-slate-700",
                ].join(" ")}
              >
                Lịch hẹn sắp tới
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
              className="rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-slate-600"
              title="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          {loading &&
          appointments.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-slate-400">
              <RefreshCw className="h-4 w-4 animate-spin" />

              Đang tải lịch hẹn...
            </div>
          ) : visibleDateKeys.length ===
            0 ? (
            <div className="px-4 py-8 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-2 text-sm font-medium text-slate-500">
                Không có lịch hẹn sắp tới
              </p>
            </div>
          ) : (
            <div>
              {visibleDateKeys.map(
                (dateKey) => (
                  <DateGroup
                    key={dateKey}
                    dateKey={dateKey}
                    appointments={
                      groupedAppointments[
                        dateKey
                      ]
                    }
                    nearestAppointmentId={
                      nearestAppointment?.id
                    }
                  />
                )
              )}
            </div>
          )}

          {/* Footer */}
          <div
            className={[
              "flex items-center justify-between border-t px-4 py-2.5",
              hasCriticalAppointment
                ? "border-red-100 bg-red-50/60"
                : hasTodayAppointment
                ? "border-orange-100 bg-orange-50/40"
                : hasTomorrowAppointment
                ? "border-blue-100 bg-blue-50/40"
                : "border-slate-100 bg-white",
            ].join(" ")}
          >
            <span className="text-[10px] text-slate-400">
              {nearestAppointment
                ? `Gần nhất: ${formatTime(
                    nearestAppointment.appointment_time
                  )}`
                : "Lịch hẹn gần nhất"}
            </span>

            <button
              type="button"
              onClick={
                fetchAppointments
              }
              disabled={loading}
              className={[
                "flex items-center gap-1 text-[10px] font-medium transition",
                hasCriticalAppointment
                  ? "text-red-600 hover:text-red-700"
                  : hasTomorrowAppointment &&
                    !hasTodayAppointment
                  ? "text-blue-600 hover:text-blue-700"
                  : "text-slate-500 hover:text-primary",
                loading
                  ? "cursor-not-allowed opacity-50"
                  : "",
              ].join(" ")}
            >
              <RefreshCw
                className={[
                  "h-3 w-3",
                  loading
                    ? "animate-spin"
                    : "",
                ].join(" ")}
              />

              Cập nhật
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
