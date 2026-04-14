import React, { useEffect, useState } from 'react';
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
  FileText,
  X,
} from 'lucide-react';

const STATUS_CONFIG = {
  scheduled: { label: 'Đã đặt', class: 'bg-sky-500/15 text-sky-600 border-sky-500/30' },
  completed: { label: 'Hoàn thành', class: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  cancelled: { label: 'Huỷ', class: 'bg-zinc-400/15 text-zinc-500 border-zinc-400/30' },
};

const CalendarView = () => {
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    appointment_time: '',
    status: '',
    reason: '',
  });

  useEffect(() => {
    fetchAppointments();
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, full_name');
    setCustomers(data || []);
  };

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*, customers(full_name)')
      .order('appointment_time', { ascending: true });
    setAppointments(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        customer_id: formData.customer_id,
        appointment_time: formData.appointment_time,
        status: formData.status || 'scheduled',
        reason: formData.reason || null,
      };
      if (editingId) {
        await supabase.from('appointments').update(payload).eq('id', editingId);
      } else {
        await supabase.from('appointments').insert([payload]);
      }
      setEditingId(null);
      setFormData({ customer_id: '', appointment_time: '', status: '', reason: '' });
      await fetchAppointments();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (appt) => {
    setEditingId(appt.id);
    setFormData({
      customer_id: appt.customer_id,
      appointment_time: appt.appointment_time?.slice(0, 16) || '',
      status: appt.status || 'scheduled',
      reason: appt.reason || '',
    });
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    const pad = (n) => String(n).padStart(2, '0');
    const d = selectedDate;
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
    setFormData({
      customer_id: '',
      appointment_time: today,
      status: 'scheduled',
      reason: '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ customer_id: '', appointment_time: '', status: '', reason: '' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá lịch hẹn này?')) return;
    await supabase.from('appointments').delete().eq('id', id);
    fetchAppointments();
  };

  const getAppointmentsForDate = (date) => {
    return appointments.filter(
      (appt) => new Date(appt.appointment_time).toDateString() === date.toDateString()
    );
  };

  const selectedAppointments = getAppointmentsForDate(selectedDate).sort(
    (a, b) => new Date(a.appointment_time) - new Date(b.appointment_time)
  );

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const hasAppointment = appointments.some(
        (appt) => new Date(appt.appointment_time).toDateString() === date.toDateString()
      );
      if (hasAppointment) {
        return 'has-appointment';
      }
    }
    return null;
  };

  return (
    <AdminLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="page-header">
          <div className="page-header-main">
            <div className="page-header-icon bg-slate-800 text-white shadow-lg">
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
            className="btn-primary inline-flex items-center gap-2 bg-slate-800 px-4"
          >
            <Plus className="h-4 w-4" />
            Tạo lịch hẹn
          </button>
        </div>

        {/* Main: Calendar + Day agenda */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Calendar panel - system style */}
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

          {/* Day agenda panel */}
          <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-200/80 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">
                {selectedDate.toLocaleDateString('vi-VN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
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
                  <p className="text-sm font-medium text-slate-600">Không có lịch hẹn</p>
                  <p className="mt-1 text-xs text-slate-500">Chọn ngày khác hoặc tạo lịch mới</p>
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
                  {selectedAppointments.map((appt) => {
                    const status = STATUS_CONFIG[appt.status] || STATUS_CONFIG.scheduled;
                    return (
                      <li
                        key={appt.id}
                        className="group rounded-lg border border-slate-100 bg-slate-50/50 p-3 transition-all hover:border-slate-200 hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-flex items-center gap-1 font-mono text-xs font-medium text-slate-600 tabular-nums"
                                aria-label="Thời gian"
                              >
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {formatTime(appt.appointment_time)}
                              </span>
                              <span
                                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${status.class}`}
                              >
                                {status.label}
                              </span>
                            </div>
                            <p className="mt-1.5 flex items-center gap-1.5 font-medium text-slate-800">
                              <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              {appt.customers?.full_name ?? '—'}
                            </p>
                            {appt.reason && (
                              <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-600">
                                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span className="line-clamp-2">{appt.reason}</span>
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => handleEdit(appt)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-200/80 hover:text-slate-700"
                              title="Sửa"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(appt.id)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-red-100 hover:text-red-600"
                              title="Xoá"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Create/Edit modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h3 id="modal-title" className="text-lg font-semibold text-slate-900">
                    {editingId ? 'Cập nhật lịch hẹn' : 'Tạo lịch hẹn mới'}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {editingId ? 'Chỉnh sửa thông tin lịch hẹn.' : 'Chọn bệnh nhân và thời gian.'}
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Bệnh nhân
                  </label>
                  <select
                    required
                    className="input-portal"
                    value={formData.customer_id}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_id: e.target.value })
                    }
                  >
                    <option value="">Chọn bệnh nhân</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Thời gian
                  </label>
                  <input
                    type="datetime-local"
                    required
                    className="input-portal"
                    value={formData.appointment_time}
                    onChange={(e) =>
                      setFormData({ ...formData, appointment_time: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Lý do / Ghi chú
                  </label>
                  <input
                    type="text"
                    className="input-portal"
                    placeholder="Lý do hẹn"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Trạng thái
                  </label>
                  <select
                    className="input-portal"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="scheduled">Đã đặt</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Huỷ</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary">
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
