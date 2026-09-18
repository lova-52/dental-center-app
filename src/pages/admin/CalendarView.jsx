// path: src/pages/admin/CalendarView.jsx

import React, { useEffect, useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';

import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Pencil,
  Trash2,
  User,
  X,
  Phone,
  StickyNote,
  Search,
  Check,
} from 'lucide-react';

/*
|--------------------------------------------------------------------------
| APPOINTMENT STATUS CONFIG
|--------------------------------------------------------------------------
| Trạng thái của bảng appointments.
|
| scheduled  -> Đã đặt
| following -> Đang theo dõi
| completed -> Hoàn thành
| cancelled -> Huỷ
|--------------------------------------------------------------------------
*/

const STATUS_CONFIG = {
  scheduled: {
    label: 'Đã đặt',
    class:
      'bg-sky-500/15 text-sky-600 border-sky-500/30',
  },

  following: {
    label: 'Đang theo dõi',
    class:
      'bg-amber-500/15 text-amber-600 border-amber-500/30',
  },

  completed: {
    label: 'Hoàn thành',
    class:
      'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  },

  cancelled: {
    label: 'Huỷ',
    class:
      'bg-zinc-400/15 text-zinc-500 border-zinc-400/30',
  },
};

/*
|--------------------------------------------------------------------------
| STATUS OPTIONS
|--------------------------------------------------------------------------
*/

const STATUS_OPTIONS = [
  {
    value: 'scheduled',
    label: 'Đã đặt',
  },
  {
    value: 'following',
    label: 'Đang theo dõi',
  },
  {
    value: 'completed',
    label: 'Hoàn thành',
  },
  {
    value: 'cancelled',
    label: 'Huỷ',
  },
];

const CalendarView = () => {
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [selectedDate, setSelectedDate] = useState(new Date());

  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [expandedAppointment, setExpandedAppointment] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | CUSTOMER SEARCH
  |--------------------------------------------------------------------------
  */

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | FORM
  |--------------------------------------------------------------------------
  */

  const [formData, setFormData] = useState({
    customer_id: '',
    appointment_time: '',
    status: '',
    reason: '',
  });

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchAppointments();
    fetchCustomers();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | FETCH CUSTOMERS
  |--------------------------------------------------------------------------
  */

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name, phone, note')
      .order('full_name', {
        ascending: true,
      });

    if (error) {
      console.error('fetchCustomers error:', error);
      alert('Không thể tải danh sách khách hàng.');
      return;
    }

    setCustomers(data || []);
  };

  /*
  |--------------------------------------------------------------------------
  | FETCH APPOINTMENTS
  |--------------------------------------------------------------------------
  */

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select(
        '*, customers(full_name, phone, note, customer_telesales(telesale_id, telesales(id, name, email, color, is_active)))'
      )
      .order('appointment_time', {
        ascending: true,
      });

    if (error) {
      console.error('fetchAppointments error:', error);
      alert('Không thể tải danh sách lịch hẹn.');
      return;
    }

    setAppointments(data || []);
  };

  /*
  |--------------------------------------------------------------------------
  | SUBMIT
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_id) {
      alert('Vui lòng chọn bệnh nhân.');
      return;
    }

    if (!formData.appointment_time) {
      alert('Vui lòng chọn thời gian.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customer_id: formData.customer_id,
        appointment_time: formData.appointment_time,
        status: formData.status || 'scheduled',
        reason: formData.reason || null,
      };

      let error = null;

      if (editingId) {
        const result = await supabase
          .from('appointments')
          .update(payload)
          .eq('id', editingId);

        error = result.error;
      } else {
        const result = await supabase
          .from('appointments')
          .insert([payload]);

        error = result.error;
      }

      if (error) {
        console.error('Appointment save error:', error);

        /*
        |--------------------------------------------------------------------------
        | Đặc biệt hữu ích nếu database chưa có enum "following"
        |--------------------------------------------------------------------------
        */

        if (
          error.code === '22P02' &&
          String(error.message || '').includes('following')
        ) {
          alert(
            'Database chưa cho phép trạng thái "Đang theo dõi" (following). Vui lòng cập nhật enum của bảng appointments trong Supabase.'
          );
        } else {
          alert(
            error.message || 'Không thể lưu lịch hẹn.'
          );
        }

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | RESET
      |--------------------------------------------------------------------------
      */

      setEditingId(null);

      setFormData({
        customer_id: '',
        appointment_time: '',
        status: '',
        reason: '',
      });

      setCustomerSearch('');
      setShowCustomerPicker(false);

      await fetchAppointments();

      setIsModalOpen(false);
    } catch (err) {
      console.error('handleSubmit error:', err);
      alert('Có lỗi xảy ra khi lưu lịch hẹn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | EDIT APPOINTMENT
  |--------------------------------------------------------------------------
  */

  const handleEdit = (appt) => {
    setEditingId(appt.id);

    const customerName =
      appt.customers?.full_name || '';

    const customerPhone =
      appt.customers?.phone || '';

    setCustomerSearch(
      customerPhone
        ? `${customerName} · ${customerPhone}`
        : customerName
    );

    setFormData({
      customer_id: appt.customer_id,
      appointment_time:
        appt.appointment_time?.slice(0, 16) || '',
      status: appt.status || 'scheduled',
      reason: appt.reason || '',
    });

    setShowCustomerPicker(false);
    setIsModalOpen(true);
  };

  /*
  |--------------------------------------------------------------------------
  | ADD NEW APPOINTMENT
  |--------------------------------------------------------------------------
  */

  const handleAddNew = () => {
    setEditingId(null);

    const pad = (n) =>
      String(n).padStart(2, '0');

    const d = selectedDate;

    const today =
      `${d.getFullYear()}-${pad(
        d.getMonth() + 1
      )}-${pad(d.getDate())}T09:00`;

    setFormData({
      customer_id: '',
      appointment_time: today,
      status: 'scheduled',
      reason: '',
    });

    setCustomerSearch('');
    setShowCustomerPicker(false);
    setIsModalOpen(true);
  };

  /*
  |--------------------------------------------------------------------------
  | CLOSE MODAL
  |--------------------------------------------------------------------------
  */

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);

    setFormData({
      customer_id: '',
      appointment_time: '',
      status: '',
      reason: '',
    });

    setCustomerSearch('');
    setShowCustomerPicker(false);
  };

  /*
  |--------------------------------------------------------------------------
  | DELETE APPOINTMENT
  |--------------------------------------------------------------------------
  */

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá lịch hẹn này?')) {
      return;
    }

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete appointment error:', error);
      alert(
        error.message || 'Không thể xoá lịch hẹn.'
      );
      return;
    }

    await fetchAppointments();
  };

  /*
  |--------------------------------------------------------------------------
  | GET APPOINTMENTS FOR DATE
  |--------------------------------------------------------------------------
  */

  const getAppointmentsForDate = (date) => {
    return appointments.filter(
      (appt) =>
        new Date(
          appt.appointment_time
        ).toDateString() === date.toDateString()
    );
  };

  /*
  |--------------------------------------------------------------------------
  | SELECTED DAY APPOINTMENTS
  |--------------------------------------------------------------------------
  */

  const selectedAppointments =
    getAppointmentsForDate(selectedDate).sort(
      (a, b) =>
        new Date(a.appointment_time) -
        new Date(b.appointment_time)
    );

  /*
  |--------------------------------------------------------------------------
  | FORMAT TIME
  |--------------------------------------------------------------------------
  */

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);

    return d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /*
  |--------------------------------------------------------------------------
  | TOGGLE APPOINTMENT
  |--------------------------------------------------------------------------
  */

  const toggleAppointment = (id) => {
    setExpandedAppointment((prev) =>
      prev === id ? null : id
    );
  };

  /*
  |--------------------------------------------------------------------------
  | FORMAT DATETIME
  |--------------------------------------------------------------------------
  */

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString(
      'vi-VN',
      {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | CALENDAR TILE
  |--------------------------------------------------------------------------
  */

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const hasAppointment =
        appointments.some(
          (appt) =>
            new Date(
              appt.appointment_time
            ).toDateString() ===
            date.toDateString()
        );

      if (hasAppointment) {
        return 'has-appointment';
      }
    }

    return null;
  };

  /*
  |--------------------------------------------------------------------------
  | CUSTOMER INFO
  |--------------------------------------------------------------------------
  */

  const getCustomerInfo = (appt) => {
    const c = appt.customers || {};

    return {
      full_name: c.full_name || '—',
      phone: c.phone || '',
      note: c.note || '',
      telesales: (c.customer_telesales || []).map((row) => row.telesales).filter(Boolean),
    };
  };

  /*
  |--------------------------------------------------------------------------
  | FILTER CUSTOMERS
  |--------------------------------------------------------------------------
  */

  const filteredCustomers = useMemo(() => {
    const q =
      customerSearch
        .trim()
        .toLowerCase();

    if (!q) {
      return customers.slice(0, 20);
    }

    return customers
      .filter((c) => {
        const name =
          (c.full_name || '')
            .toLowerCase();

        const phone =
          (c.phone || '')
            .toLowerCase();

        const note =
          (c.note || '')
            .toLowerCase();

        return (
          name.includes(q) ||
          phone.includes(q) ||
          note.includes(q)
        );
      })
      .slice(0, 20);
  }, [customers, customerSearch]);

  /*
  |--------------------------------------------------------------------------
  | SELECTED CUSTOMER
  |--------------------------------------------------------------------------
  */

  const selectedCustomer = useMemo(() => {
    return (
      customers.find(
        (c) =>
          c.id === formData.customer_id
      ) || null
    );
  }, [
    customers,
    formData.customer_id,
  ]);

  /*
  |--------------------------------------------------------------------------
  | CUSTOMER INPUT
  |--------------------------------------------------------------------------
  */

  const handleCustomerInputChange = (
    value
  ) => {
    setCustomerSearch(value);

    setFormData((prev) => ({
      ...prev,
      customer_id: '',
    }));

    setShowCustomerPicker(true);
  };

  /*
  |--------------------------------------------------------------------------
  | SELECT CUSTOMER
  |--------------------------------------------------------------------------
  */

  const handleSelectCustomer = (
    customer
  ) => {
    setFormData((prev) => ({
      ...prev,
      customer_id: customer.id,
    }));

    setCustomerSearch(
      customer.phone
        ? `${customer.full_name} · ${customer.phone}`
        : customer.full_name
    );

    setShowCustomerPicker(false);
  };

  /*
  |--------------------------------------------------------------------------
  | CLEAR CUSTOMER
  |--------------------------------------------------------------------------
  */

  const clearCustomerSelection = () => {
    setFormData((prev) => ({
      ...prev,
      customer_id: '',
    }));

    setCustomerSearch('');
    setShowCustomerPicker(true);
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <AdminLayout>
      <div className="space-y-6 sm:space-y-8">

        {/* ================================================================
            HEADER
        ================================================================ */}

        <div className="page-header">
          <div className="page-header-main">

            <div className="page-header-icon bg-blue-100 text-[#025899] shadow-lg">
              <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>

            <div>
              <h2 className="page-header-title text-slate-800">
                Quản lý lịch hẹn
              </h2>

              <p className="page-header-subtitle">
                Lịch hẹn bệnh nhân và thời gian điều trị
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddNew}
            className="btn-primary inline-flex items-center gap-2 px-4"
          >
            <Plus className="h-4 w-4" />
            Tạo lịch hẹn
          </button>
        </div>

        {/* ================================================================
            MAIN
        ================================================================ */}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">

          {/* ============================================================
              CALENDAR
          ============================================================ */}

          <div className="calendar-system overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">

            <div className="border-b border-slate-200/80 bg-slate-50 px-4 py-3">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Chọn ngày
              </span>
            </div>

            <div className="p-3 sm:p-4">
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                locale="vi-VN"
                next2Label={null}
                prev2Label={null}
                tileClassName={tileClassName}
                className="w-full border-0 bg-transparent"
              />
            </div>
          </div>

          {/* ============================================================
              DAY AGENDA
          ============================================================ */}

          <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">

            <div className="border-b border-slate-200/80 bg-slate-50 px-4 py-3">

              <h3 className="text-sm font-semibold text-slate-800">
                {selectedDate.toLocaleDateString(
                  'vi-VN',
                  {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }
                )}
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                {selectedAppointments.length} lịch hẹn
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">

              {selectedAppointments.length === 0 ? (

                <div className="flex flex-col items-center justify-center py-12 text-center">

                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Clock className="h-6 w-6" />
                  </div>

                  <p className="text-sm font-medium text-slate-600">
                    Không có lịch hẹn
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Chọn ngày khác hoặc tạo lịch mới
                  </p>

                  <button
                    type="button"
                    onClick={handleAddNew}
                    className="mt-4 text-sm font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900"
                  >
                    Tạo lịch hẹn cho ngày này
                  </button>
                </div>

              ) : (

                <ul className="space-y-3">

                  {selectedAppointments.map(
                    (appt) => {
                      const status =
                        STATUS_CONFIG[
                          appt.status
                        ] ||
                        STATUS_CONFIG.scheduled;

                      const customer =
                        getCustomerInfo(appt);

                      return (
                        <li
                          key={appt.id}
                          onClick={() =>
                            toggleAppointment(
                              appt.id
                            )
                          }
                          className={`group cursor-pointer rounded-lg border bg-slate-50/50 p-3 transition-all duration-300 hover:border-slate-200 hover:bg-slate-50 ${
                            expandedAppointment ===
                            appt.id
                              ? 'border-blue-300 shadow-md'
                              : 'border-slate-100'
                          }`}
                        >

                          <div className="flex items-start justify-between gap-2">

                            <div className="min-w-0 flex-1">

                              {/* TIME + STATUS */}

                              <div className="flex flex-wrap items-center gap-2">

                                <span
                                  className="inline-flex items-center gap-1 font-mono text-xs font-medium text-slate-600 tabular-nums"
                                  aria-label="Thời gian"
                                >
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />

                                  {formatTime(
                                    appt.appointment_time
                                  )}
                                </span>

                                <span
                                  className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${status.class}`}
                                >
                                  {status.label}
                                </span>
                              </div>

                              {/* CUSTOMER */}

                              <p className="mt-1.5 flex items-center gap-1.5 font-medium text-slate-800">

                                <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />

                                <span className="truncate">
                                  {customer.full_name}
                                </span>

                              </p>

                              {/* TELESALE — always visible */}
                              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Telesale:</span>
                                {customer.telesales?.length ? customer.telesales.map((t) => (
                                  <span key={t.id} className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${t.color || '#64748B'}18`, borderColor: `${t.color || '#64748B'}55`, color: t.color || '#64748B' }}>
                                    <span className="truncate">{t.name}</span>
                                  </span>
                                )) : <span className="text-[11px] text-slate-400">Chưa phân công</span>}
                              </div>

                              {/* PHONE */}

                              {customer.phone && (
                                <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-600">

                                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />

                                  <span className="break-all">
                                    {customer.phone}
                                  </span>

                                </p>
                              )}

                              {/* NOTE */}

                              {customer.note && (
                                <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-600">

                                  <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />

                                  <span className="line-clamp-2 break-words">
                                    {customer.note}
                                  </span>

                                </p>
                              )}

                              {/* =================================================
                                  EXPANDED
                              ================================================= */}

                              {expandedAppointment ===
                                appt.id && (

                                <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">

                                  <div className="grid gap-3 text-sm sm:grid-cols-2">

                                    <div>
                                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                        Bệnh nhân
                                      </p>

                                      <p className="mt-1 font-medium text-slate-800">
                                        {customer.full_name}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                        Số điện thoại
                                      </p>

                                      <p className="mt-1 text-slate-700">
                                        {customer.phone ||
                                          '--'}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                        Thời gian
                                      </p>

                                      <p className="mt-1 text-slate-700">
                                        {formatDateTime(
                                          appt.appointment_time
                                        )}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                        Trạng thái
                                      </p>

                                      <span
                                        className={`mt-1 inline-flex rounded border px-2 py-1 text-xs font-medium ${status.class}`}
                                      >
                                        {status.label}
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Telesale phụ trách</p>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                      {customer.telesales?.length ? customer.telesales.map((t) => (
                                        <span key={t.id} className="inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold" style={{ backgroundColor: `${t.color || '#64748B'}18`, borderColor: `${t.color || '#64748B'}55`, color: t.color || '#64748B' }}>{t.name}</span>
                                      )) : <span className="text-sm text-slate-500">Chưa phân công</span>}
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                      Lý do lịch hẹn
                                    </p>

                                    <div className="mt-1 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                                      {appt.reason ||
                                        'Không có'}
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                      Ghi chú khách hàng
                                    </p>

                                    <div className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
                                      {customer.note ||
                                        'Không có'}
                                    </div>
                                  </div>

                                </div>
                              )}
                            </div>

                            {/* =================================================
                                ACTIONS
                            ================================================= */}

                            <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">

                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  handleEdit(appt);
                                }}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-200/80 hover:text-slate-700"
                                title="Sửa"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  handleDelete(
                                    appt.id
                                  );
                                }}
                                className="rounded-lg p-2 text-slate-500 hover:bg-red-100 hover:text-red-600"
                                title="Xoá"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>

                            </div>
                          </div>
                        </li>
                      );
                    }
                  )}

                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================
            CREATE / EDIT MODAL
        ================================================================ */}

        {isModalOpen && (

          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >

            <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xl sm:p-6">

              {/* MODAL HEADER */}

              <div className="mb-5 flex items-start justify-between gap-3">

                <div>
                  <h3
                    id="modal-title"
                    className="text-lg font-semibold text-slate-900"
                  >
                    {editingId
                      ? 'Cập nhật lịch hẹn'
                      : 'Tạo lịch hẹn mới'}
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {editingId
                      ? 'Chỉnh sửa thông tin lịch hẹn.'
                      : 'Chọn bệnh nhân và thời gian.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>

              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >

                {/* ========================================================
                    CUSTOMER
                ======================================================== */}

                <div className="relative">

                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Bệnh nhân
                  </label>

                  <div className="relative">

                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />

                    <input
                      type="text"
                      className="input-portal w-full py-3 pl-9 pr-10"
                      placeholder="Tìm theo tên, số điện thoại hoặc ghi chú..."
                      value={customerSearch}
                      onChange={(e) =>
                        handleCustomerInputChange(
                          e.target.value
                        )
                      }
                      onFocus={() =>
                        setShowCustomerPicker(
                          true
                        )
                      }
                      autoComplete="off"
                    />

                    {formData.customer_id && (
                      <button
                        type="button"
                        onClick={
                          clearCustomerSelection
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Xóa bệnh nhân đã chọn"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* CUSTOMER PICKER */}

                  {showCustomerPicker && (

                    <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">

                      <div className="max-h-64 overflow-y-auto">

                        {filteredCustomers.length ===
                        0 ? (

                          <div className="px-4 py-3 text-sm text-slate-500">
                            Không tìm thấy bệnh nhân phù hợp.
                          </div>

                        ) : (

                          filteredCustomers.map(
                            (customer) => {

                              const isSelected =
                                customer.id ===
                                formData.customer_id;

                              return (
                                <button
                                  key={customer.id}
                                  type="button"
                                  onClick={() =>
                                    handleSelectCustomer(
                                      customer
                                    )
                                  }
                                  className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 ${
                                    isSelected
                                      ? 'bg-sky-50'
                                      : 'bg-white'
                                  }`}
                                >

                                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                    <User className="h-4 w-4" />
                                  </div>

                                  <div className="min-w-0 flex-1">

                                    <div className="flex items-center gap-2">

                                      <p className="truncate text-sm font-semibold text-slate-800">
                                        {customer.full_name ||
                                          '—'}
                                      </p>

                                      {isSelected && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">

                                          <Check className="h-3 w-3" />

                                          Đã chọn
                                        </span>
                                      )}

                                    </div>

                                    {customer.phone && (
                                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">

                                        <Phone className="h-3.5 w-3.5" />

                                        <span className="truncate">
                                          {customer.phone}
                                        </span>

                                      </p>
                                    )}

                                    {customer.note && (
                                      <p className="mt-1 flex items-start gap-1 text-xs text-slate-500">

                                        <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                                        <span className="line-clamp-2 break-words">
                                          {customer.note}
                                        </span>

                                      </p>
                                    )}

                                  </div>
                                </button>
                              );
                            }
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* SELECTED CUSTOMER */}

                  {selectedCustomer && (

                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">

                      <div className="font-medium text-slate-700">
                        {selectedCustomer.full_name}
                      </div>

                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1">

                        {selectedCustomer.phone && (
                          <span>
                            📞 {selectedCustomer.phone}
                          </span>
                        )}

                        {selectedCustomer.note && (
                          <span className="line-clamp-1">
                            📝 {selectedCustomer.note}
                          </span>
                        )}

                      </div>
                    </div>
                  )}
                </div>

                {/* ========================================================
                    APPOINTMENT TIME
                ======================================================== */}

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Thời gian
                  </label>

                  <input
                    type="datetime-local"
                    required
                    className="input-portal"
                    value={
                      formData.appointment_time
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        appointment_time:
                          e.target.value,
                      })
                    }
                  />
                </div>

                {/* ========================================================
                    REASON
                ======================================================== */}

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Lý do / Ghi chú
                  </label>

                  <input
                    type="text"
                    className="input-portal"
                    placeholder="Lý do hẹn"
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reason: e.target.value,
                      })
                    }
                  />
                </div>

                {/* ========================================================
                    STATUS
                ======================================================== */}

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Trạng thái
                  </label>

                  <select
                    className="input-portal"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value,
                      })
                    }
                  >

                    {STATUS_OPTIONS.map(
                      (option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      )
                    )}

                  </select>
                </div>

                {/* ========================================================
                    BUTTONS
                ======================================================== */}

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting
                      ? 'Đang lưu...'
                      : editingId
                      ? 'Cập nhật'
                      : 'Tạo lịch hẹn'}
                  </button>

                </div>

              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default CalendarView;