// path: src/pages/admin/Incidents.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { Activity, FileText, Plus, Pencil, Trash2, X, Clock, Stethoscope, Image as ImageIcon, Paperclip } from 'lucide-react';

/**
 * STATUS CONFIG (hiện tại chưa render UI nhưng giữ nguyên để future use)
 */
const STATUS_CONFIG = {
  scheduled: { label: 'Đã đặt', class: 'bg-sky-500/15 text-sky-600 border-sky-500/30' },
  completed: { label: 'Hoàn thành', class: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  cancelled: { label: 'Huỷ', class: 'bg-zinc-400/15 text-zinc-500 border-zinc-400/30' },
};

/**
 * Initial form state dùng chung để tránh duplicate code
 */
const INITIAL_FORM = {
  appointment_time: '',
  service_id: '',
  description: '',
  doctor_name: '',
  status: '',
};

const MAX_FILES = 3;
const MAX_FILE_SIZE = 200 * 1024; // 200KB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const Treatments = () => {
  const { patientId } = useParams();

  // =========================
  // STATE MANAGEMENT
  // =========================
  const [treatments, setTreatments] = useState([]);
  const [services, setServices] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================
  // FILE HELPERS
  // =========================
  const getPublicFileUrl = (filePath) => {
    if (!filePath) return '';
    return supabase.storage.from('treatment-files').getPublicUrl(filePath).data.publicUrl;
  };

  const isValidImageFile = (file) => {
    if (!file) return false;
    const typeOk = ALLOWED_IMAGE_TYPES.includes(file.type);
    const nameOk = /\.(jpe?g|png|webp)$/i.test(file.name || '');
    return typeOk || nameOk;
  };

  const validateSelectedFiles = (files, currentExistingCount = 0) => {
    if (!files.length) return null;

    if (files.length > MAX_FILES) {
      return `Bạn chỉ được chọn tối đa ${MAX_FILES} ảnh.`;
    }

    if (currentExistingCount + files.length > MAX_FILES) {
      return `Tổng số ảnh mỗi phiếu điều trị không được vượt quá ${MAX_FILES} ảnh.`;
    }

    const invalidType = files.find((file) => !isValidImageFile(file));
    if (invalidType) {
      return 'Chỉ cho phép ảnh JPG, JPEG, PNG, WEBP.';
    }

    const invalidSize = files.find((file) => file.size > MAX_FILE_SIZE);
    if (invalidSize) {
      return 'Mỗi ảnh phải nhỏ hơn 200KB.';
    }

    return null;
  };

  const uploadTreatmentFiles = async (treatmentId, files) => {
    if (!treatmentId || !files?.length) return;

    for (const file of files) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `treatments/${treatmentId}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('treatment-files')
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type,
          cacheControl: '3600',
        });

      if (uploadError) {
        throw uploadError;
      }

      const { error: insertError } = await supabase.from('treatment_files').insert([
        {
          treatment_id: treatmentId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        },
      ]);

      if (insertError) {
        // Nếu insert DB fail sau khi upload storage thành công, vẫn throw để báo lỗi.
        // Storage file có thể được dọn thủ công nếu cần.
        throw insertError;
      }
    }
  };

  const loadTreatmentFilesForEdit = (files = []) => {
    setExistingFiles(files || []);
  };

  // =========================
  // DATA FETCHING
  // =========================

  /**
   * Lấy danh sách services
   */
  const fetchServices = useCallback(async () => {
    const { data } = await supabase.from('services').select('*');
    setServices(data || []);
  }, []);

  /**
   * Lấy danh sách treatments theo patientId
   */
  const fetchTreatments = useCallback(async () => {
    const { data } = await supabase
      .from('treatments')
      .select(`
        *,
        services ( name ),
        treatment_files (
          id,
          treatment_id,
          file_name,
          file_path,
          file_type,
          file_size,
          uploaded_at
        )
      `)
      .eq('customer_id', patientId)
      .order('treatment_date', { ascending: false });

    setTreatments(data || []);
  }, [patientId]);

  // Load data khi mount
  useEffect(() => {
    fetchTreatments();
    fetchServices();
  }, [fetchTreatments, fetchServices]);

  // =========================
  // HELPERS
  // =========================

  /**
   * Reset form về trạng thái ban đầu
   */
  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setSelectedFiles([]);
    setExistingFiles([]);
  };

  /**
   * Format datetime hiển thị UI
   */
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const removeSelectedFileAtIndex = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // =========================
  // CRUD HANDLERS
  // =========================

  /**
   * Xoá 1 file ảnh
   */
  const handleDeleteTreatmentFile = async (fileId, filePath) => {
    if (!window.confirm('Xoá hình này?')) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('treatment-files')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('treatment_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      setExistingFiles((prev) => prev.filter((f) => f.id !== fileId));
      await fetchTreatments();
    } catch (error) {
      console.error('Delete file error:', error);
      window.alert('Không thể xoá hình. Vui lòng thử lại.');
    }
  };

  /**
   * Xoá treatment
   */
  const handleDelete = async (id) => {
    if (!window.confirm('Xoá điều trị?')) return;

    try {
      const { data: files, error: fileFetchError } = await supabase
        .from('treatment_files')
        .select('file_path')
        .eq('treatment_id', id);

      if (fileFetchError) throw fileFetchError;

      const filePaths = (files || [])
        .map((f) => f.file_path)
        .filter(Boolean);

      if (filePaths.length > 0) {
        const { error: storageRemoveError } = await supabase.storage
          .from('treatment-files')
          .remove(filePaths);

        if (storageRemoveError) throw storageRemoveError;
      }

      const { error: deleteError } = await supabase
        .from('treatments')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchTreatments();
    } catch (error) {
      console.error('Delete treatment error:', error);
      window.alert('Không thể xoá phiếu điều trị. Vui lòng thử lại.');
    }
  };

  /**
   * Mở form edit
   */
  const handleEdit = (t) => {
    setEditingId(t.id);

    setFormData({
      appointment_time: t.treatment_date ? t.treatment_date.slice(0, 16) : '',
      service_id: t.service_id || '',
      description: t.description || '',
      doctor_name: t.doctor_name || '',
      status: '', // giữ nguyên logic cũ
    });

    loadTreatmentFilesForEdit(t.treatment_files || []);
    setSelectedFiles([]);
    setIsModalOpen(true);
  };

  /**
   * Mở form tạo mới
   */
  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  /**
   * Đóng modal
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) {
      setSelectedFiles([]);
      return;
    }

    const validationError = validateSelectedFiles(files, editingId ? existingFiles.length : 0);
    if (validationError) {
      window.alert(validationError);
      e.target.value = '';
      setSelectedFiles([]);
      return;
    }

    setSelectedFiles(files);
  };

  const handleDeleteExistingFile = async (fileId, filePath) => {
    await handleDeleteTreatmentFile(fileId, filePath);
  };

  /**
   * Submit form (create / update)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // validate tối thiểu (giữ nguyên logic cũ)
    if (!formData.appointment_time || !formData.service_id) return;

    const totalFilesAfterSave = (editingId ? existingFiles.length : 0) + selectedFiles.length;
    if (totalFilesAfterSave > MAX_FILES) {
      window.alert(`Tổng số ảnh mỗi phiếu điều trị không được vượt quá ${MAX_FILES} ảnh.`);
      return;
    }

    const selectedValidationError = validateSelectedFiles(selectedFiles, editingId ? existingFiles.length : 0);
    if (selectedValidationError) {
      window.alert(selectedValidationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // =========================
      // UPDATE FLOW
      // =========================
      if (editingId) {
        const { error: updateError } = await supabase
          .from('treatments')
          .update({
            service_id: Number(formData.service_id),
            description: formData.description,
            doctor_name: formData.doctor_name,
            treatment_date: formData.appointment_time,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;

        if (selectedFiles.length > 0) {
          await uploadTreatmentFiles(editingId, selectedFiles);
        }

        resetForm();
      }

      // =========================
      // CREATE FLOW
      // =========================
      else {
        const { data: appt, error: apptError } = await supabase
          .from('appointments')
          .insert([
            {
              customer_id: patientId,
              appointment_time: formData.appointment_time,
              status: formData.status,
              reason: formData.description,
            },
          ])
          .select()
          .single();

        if (apptError) throw apptError;

        if (!appt) {
          window.alert('Lỗi tạo lịch hẹn');
          return;
        }

        const { data: treatment, error: treatmentError } = await supabase
          .from('treatments')
          .insert([
            {
              customer_id: patientId,
              appointment_id: appt.id,
              service_id: Number(formData.service_id),
              description: formData.description,
              doctor_name: formData.doctor_name,
              treatment_date: formData.appointment_time,
            },
          ])
          .select()
          .single();

        if (treatmentError) throw treatmentError;

        if (treatment && selectedFiles.length > 0) {
          await uploadTreatmentFiles(treatment.id, selectedFiles);
        }
      }

      // refresh data sau khi submit
      await fetchTreatments();

      // reset UI state
      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Submit treatment error:', error);
      window.alert(error?.message || 'Có lỗi xảy ra khi lưu phiếu điều trị.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================
  // RENDER
  // =========================

  return (
    <AdminLayout>
      <div className="page-shell-narrow">

        {/* HEADER */}
        <div className="page-header">
          <div className="page-header-main">
            <div className="page-header-icon">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h2 className="page-header-title">Phiếu điều trị</h2>
              <p className="page-header-subtitle">
                Quản lý các lần điều trị và lịch hẹn cho bệnh nhân
              </p>
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

        {/* LIST */}
        <div className="card-portal">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <FileText className="h-4 w-4 text-primary" />
              Lịch sử điều trị
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {treatments.length} phiếu điều trị
            </p>
          </div>

          {/* EMPTY STATE */}
          {treatments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Stethoscope className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-600">Chưa có điều trị</p>
              <p className="mt-1 text-xs text-slate-500">
                Thêm phiếu điều trị đầu tiên cho bệnh nhân
              </p>
            </div>
          ) : (
            <ul className="space-y-3 p-4">
              {treatments.map((t) => (
                <li
                  key={t.id}
                  className="group rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">

                    {/* INFO */}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800">
                        {t.services?.name}
                      </p>

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
                        <p className="mt-2 text-sm text-slate-600">
                          {t.description}
                        </p>
                      )}

                      {t.treatment_files?.length > 0 && (
                        <div className="mt-3">
                          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <ImageIcon className="h-3.5 w-3.5" />
                            Hình phiếu điều trị
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {t.treatment_files.map((file) => {
                              const url = getPublicFileUrl(file.file_path);
                              return (
                                <a
                                  key={file.id}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group/file block overflow-hidden rounded-lg border border-slate-200 bg-white"
                                  title={file.file_name || 'Hình phiếu điều trị'}
                                >
                                  <img
                                    src={url}
                                    alt={file.file_name || 'Hình phiếu điều trị'}
                                    className="h-20 w-20 object-cover transition-transform duration-200 group-hover/file:scale-105"
                                  />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACTIONS */}
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

        {/* MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl">

              {/* MODAL HEADER */}
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {editingId
                      ? 'Cập nhật phiếu điều trị'
                      : 'Tạo phiếu điều trị mới'}
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {editingId
                      ? 'Chỉnh sửa thông tin điều trị.'
                      : 'Nhập thông tin cho lần điều trị mới.'}
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

              {/* FORM */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* TIME + SERVICE */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Thời gian điều trị
                    </label>
                    <input
                      type="datetime-local"
                      required
                      className="input-portal"
                      value={formData.appointment_time}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          appointment_time: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Dịch vụ
                    </label>
                    <select
                      required
                      className="input-portal"
                      value={formData.service_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          service_id: e.target.value,
                        })
                      }
                    >
                      <option value="">Chọn dịch vụ</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* DOCTOR */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Tên bác sĩ
                  </label>
                  <input
                    type="text"
                    className="input-portal"
                    placeholder="Tên bác sĩ"
                    value={formData.doctor_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        doctor_name: e.target.value,
                      })
                    }
                  />
                </div>

                {/* DESCRIPTION */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Mô tả điều trị
                  </label>
                  <textarea
                    required
                    className="input-portal min-h-[100px] resize-none"
                    placeholder="Mô tả điều trị"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                {/* FILE UPLOAD */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Hình chụp phiếu điều trị
                  </label>

                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="input-portal"
                    onChange={handleFileChange}
                  />

                  <p className="mt-1.5 text-xs text-slate-500">
                    Tối đa {MAX_FILES} ảnh, mỗi ảnh nhỏ hơn 200KB. Chỉ chấp nhận JPG, JPEG, PNG, WEBP.
                  </p>

                  {selectedFiles.length > 0 && (
                    <div className="mt-3">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Paperclip className="h-3.5 w-3.5" />
                        Ảnh đã chọn ({selectedFiles.length})
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-700">
                                {file.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeSelectedFileAtIndex(index)}
                              className="ml-3 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              aria-label="Remove selected file"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* EXISTING FILES WHEN EDIT */}
                {editingId && existingFiles.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Hình đã tải lên
                    </label>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {existingFiles.map((file) => {
                        const url = getPublicFileUrl(file.file_path);
                        return (
                          <div key={file.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              title={file.file_name || 'Hình phiếu điều trị'}
                            >
                              <img
                                src={url}
                                alt={file.file_name || 'Hình phiếu điều trị'}
                                className="h-28 w-full object-cover"
                              />
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDeleteExistingFile(file.id, file.file_path)}
                              className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white shadow-md transition-colors hover:bg-red-600"
                              aria-label="Delete existing file"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STATUS (CREATE ONLY) */}
                {!editingId && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Trạng thái lịch hẹn
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
                      <option value="">Trạng thái</option>
                      <option value="scheduled">Đã đặt lịch</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="cancelled">Huỷ</option>
                    </select>
                  </div>
                )}

                {/* ACTIONS */}
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
                      ? editingId
                        ? 'Đang cập nhật...'
                        : 'Đang tạo...'
                      : editingId
                      ? 'Cập nhật phiếu'
                      : 'Tạo phiếu điều trị'}
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
