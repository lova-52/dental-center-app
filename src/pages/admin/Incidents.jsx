import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { Activity, FileText, Plus, Pencil, Trash2, X, Clock, Stethoscope } from 'lucide-react';

const STATUS_CONFIG = {
  scheduled: { label: 'Đã đặt', class: 'bg-sky-500/15 text-sky-600 border-sky-500/30' },
  completed: { label: 'Hoàn thành', class: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  cancelled: { label: 'Huỷ', class: 'bg-zinc-400/15 text-zinc-500 border-zinc-400/30' },
};

const Treatments = () => {
  const { patientId } = useParams();

  const [treatments, setTreatments] = useState([]);
  const [services, setServices] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    appointment_time: '',
    service_id: '',
    description: '',
    doctor_name: '',
    status: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchServices = useCallback(async () => {
    const { data } = await supabase
      .from('services')
      .select('*');

    setServices(data || []);
  }, []);

  const fetchTreatments = useCallback(async () => {
    const { data } = await supabase
      .from('treatments')
      .select(`
        *,
        services ( name, price )
      `)
      .eq('customer_id', patientId)
      .order('treatment_date', { ascending: false });

    setTreatments(data || []);
  }, [patientId]);

  useEffect(() => {
    fetchTreatments();
    fetchServices();
  }, [fetchTreatments, fetchServices]);

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá điều trị?')) return;
    await supabase.from('treatments').delete().eq('id', id);
    fetchTreatments();
  };

  const handleEdit = (t) => {
    setEditingId(t.id);
    setFormData({
      appointment_time: t.treatment_date.slice(0, 16),
      service_id: t.service_id,
      description: t.description,
      doctor_name: t.doctor_name,
      status: '',
    });
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      appointment_time: '',
      service_id: '',
      description: '',
      doctor_name: '',
      status: '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      appointment_time: '',
      service_id: '',
      description: '',
      doctor_name: '',
      status: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.appointment_time || !formData.service_id) return;

    setIsSubmitting(true);

    const selectedService = services.find(
      s => s.id === Number(formData.service_id)
    );

    try {
      if (editingId) {
        await supabase
          .from('treatments')
          .update({
            service_id: Number(formData.service_id),
            description: formData.description,
            doctor_name: formData.doctor_name,
            total_amount: selectedService?.price || 0,
            treatment_date: formData.appointment_time,
          })
          .eq('id', editingId);
        setEditingId(null);
      } else {
        const { data: appt } = await supabase
          .from('appointments')
          .insert([{
            customer_id: patientId,
            appointment_time: formData.appointment_time,
            status: formData.status,
            reason: formData.description
          }])
          .select()
          .single();

        if (!appt) {
          window.alert('Lỗi tạo lịch hẹn');
          return;
        }

        await supabase
          .from('treatments')
          .insert([{
            customer_id: patientId,
            appointment_id: appt.id,
            service_id: Number(formData.service_id),
            description: formData.description,
            doctor_name: formData.doctor_name,
            total_amount: selectedService?.price || 0,
            treatment_date: formData.appointment_time
          }]);
      }

      await fetchTreatments();

      setFormData({
        appointment_time: '',
        service_id: '',
        description: '',
        doctor_name: '',
        status: '',
      });
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  return (
    <AdminLayout>
      <div className="page-shell-narrow">
        <div className="page-header">
          <div className="page-header-main">
            <div className="page-header-icon">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h2 className="page-header-title">Phiếu điều trị</h2>
              <p className="page-header-subtitle">Quản lý các lần điều trị và lịch hẹn cho bệnh nhân</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddNew}
            className="btn-primary inline-flex items-center gap-2 px-4"
          >
            <Plus className="h-4 w-4" />
            Thêm phiếu điều trị
          </button>
        </div>

        <div className="card-portal">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <FileText className="h-4 w-4 text-primary" />
              Lịch sử điều trị
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">{treatments.length} phiếu điều trị</p>
          </div>

          {treatments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Stethoscope className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-600">Chưa có điều trị</p>
              <p className="mt-1 text-xs text-slate-500">Thêm phiếu điều trị đầu tiên cho bệnh nhân</p>
            </div>
          ) : (
            <ul className="space-y-3 p-4">
              {treatments.map(t => (
                <li key={t.id} className="group rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-slate-200 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800">{t.services?.name}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {formatDateTime(t.treatment_date)}
                        </span>
                        {t.doctor_name && (
                          <span className="flex items-center gap-1">
                            <Stethoscope className="h-3.5 w-3.5 text-slate-400" />
                            {t.doctor_name}
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="mt-2 text-sm text-slate-600">{t.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">
                        {Number(t.total_amount).toLocaleString('vi-VN')} ₫
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(t)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-200"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xoá
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isModalOpen && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {editingId ? 'Cập nhật phiếu điều trị' : 'Tạo phiếu điều trị mới'}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {editingId ? 'Chỉnh sửa thông tin điều trị.' : 'Nhập thông tin cho lần điều trị mới.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Thời gian điều trị</label>
                    <input
                      type="datetime-local"
                      required
                      className="input-portal"
                      value={formData.appointment_time}
                      onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Dịch vụ</label>
                    <select
                      required
                      className="input-portal"
                      value={formData.service_id}
                      onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                    >
                      <option value="">Chọn dịch vụ</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} - {Number(s.price).toLocaleString('vi-VN')} VNĐ
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Tên bác sĩ</label>
                  <input
                    type="text"
                    className="input-portal"
                    placeholder="Tên bác sĩ"
                    value={formData.doctor_name}
                    onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Mô tả điều trị</label>
                  <textarea
                    required
                    className="input-portal min-h-[100px] resize-none"
                    placeholder="Mô tả điều trị"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {!editingId && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Trạng thái lịch hẹn</label>
                    <select
                      className="input-portal"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="">Trạng thái</option>
                      <option value="scheduled">Đã đặt lịch</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="cancelled">Huỷ</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting
                      ? (editingId ? 'Đang cập nhật...' : 'Đang tạo...')
                      : (editingId ? 'Cập nhật phiếu' : 'Tạo phiếu điều trị')}
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

export default Treatments;