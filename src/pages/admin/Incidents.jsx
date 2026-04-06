import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';

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

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">Phiếu điều trị</h2>
            <p className="text-xs text-gray-500 sm:text-sm">
              Quản lý các lần điều trị và lịch hẹn cho bệnh nhân.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
          >
            + Thêm phiếu điều trị
          </button>
        </div>

        <div className="card-portal">
          <h3 className="mb-4 font-semibold text-gray-800">Lịch sử điều trị</h3>
          {treatments.length === 0 ? (
            <p className="py-6 text-center text-gray-500">Chưa có điều trị.</p>
          ) : (
            <ul className="space-y-3">
              {treatments.map(t => (
                <li key={t.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-colors hover:bg-gray-50">
                  <p className="font-semibold text-gray-800">{t.services?.name}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {new Date(t.treatment_date).toLocaleString('vi-VN')}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{t.description}</p>
                  <p className="mt-1 font-medium text-primary">
                    {Number(t.total_amount).toLocaleString('vi-VN')} VNĐ
                  </p>
                  {t.doctor_name && (
                    <p className="mt-1 text-sm text-gray-500">Bác sĩ: {t.doctor_name}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleEdit(t)} className="min-h-[36px] rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200">
                      Sửa
                    </button>
                    <button type="button" onClick={() => handleDelete(t.id)} className="min-h-[36px] rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200">
                      Xoá
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {editingId ? 'Cập nhật phiếu điều trị' : 'Tạo phiếu điều trị mới'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {editingId ? 'Chỉnh sửa thông tin điều trị.' : 'Nhập thông tin cho lần điều trị mới.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <span className="sr-only">Đóng</span>
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Thời gian điều trị</label>
                    <input
                      type="datetime-local"
                      required
                      className="input-portal"
                      value={formData.appointment_time}
                      onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Dịch vụ</label>
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
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Tên bác sĩ</label>
                  <input
                    className="input-portal"
                    placeholder="Tên bác sĩ"
                    value={formData.doctor_name}
                    onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Mô tả điều trị</label>
                  <textarea
                    required
                    className="input-portal min-h-[100px]"
                    placeholder="Mô tả điều trị"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {!editingId && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Trạng thái lịch hẹn</label>
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
                    className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
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