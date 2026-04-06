// src/pages/admin/Patients.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import { Users, UserPlus, Pencil, Trash2, FileText, ImagePlus } from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    contact: '',
    healthInfo: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch customers error', error);
      return;
    }

    const mapped = await Promise.all(
      data.map(async (c) => {
        if (c.link_pfp) {
          const { data: urlData } = supabase.storage.from('customers').getPublicUrl(c.link_pfp);
          c.pfp_url = urlData?.publicUrl || c.link_pfp;
        } else {
          c.pfp_url = null;
        }
        return c;
      })
    );
    setCustomers(mapped);
  };

  const resetForm = () => {
    setFormData({ name: '', dob: '', contact: '', healthInfo: '' });
    setEditingId(null);
    setFile(null);
    setPreviewUrl(null);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const uploadFileToSupabase = async (fileToUpload, customerId) => {
    if (!fileToUpload) return null;
    const ext = fileToUpload.name.split('.').pop();
    const filename = `${customerId || crypto.randomUUID?.() || Date.now()}_${Date.now()}.${ext}`;
    const filePath = `customers/${filename}`;
    const { error: uploadError } = await supabase.storage.from('customers').upload(filePath, fileToUpload, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('customers').getPublicUrl(filePath);
    return { path: filePath, publicUrl: urlData?.publicUrl || null };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const birthYear = formData.dob ? new Date(formData.dob).getFullYear() : null;

      if (editingId) {
        const updates = { full_name: formData.name, birth_year: birthYear, phone: formData.contact, note: formData.healthInfo };
        if (file) {
          const res = await uploadFileToSupabase(file, editingId);
          updates.link_pfp = res.path;
        }
        const { error } = await supabase.from('customers').update(updates).eq('id', editingId);
        if (error) throw error;
      } else {
        const newId = crypto.randomUUID?.() || `c${Date.now()}`;
        let link_pfp_path = null;
        if (file) {
          const res = await uploadFileToSupabase(file, newId);
          link_pfp_path = res.path;
        }
        const { error } = await supabase.from('customers').insert([{
          id: newId,
          full_name: formData.name,
          birth_year: birthYear,
          phone: formData.contact,
          note: formData.healthInfo,
          link_pfp: link_pfp_path,
        }]);
        if (error) throw error;
      }
      await fetchCustomers();
      resetForm();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra. Xem console để biết chi tiết.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.full_name || '',
      dob: customer.birth_year ? `${customer.birth_year}-01-01` : '',
      contact: customer.phone || '',
      healthInfo: customer.note || '',
    });
    setPreviewUrl(customer.pfp_url || null);
    setFile(null);
    setIsModalOpen(true);
  };

  const handleAddNewCustomer = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setIsModalOpen(false);
  };

  const handleDelete = async (customer) => {
    if (!window.confirm('Bạn có chắc muốn xóa khách hàng này?')) return;
    setLoading(true);
    try {
      if (customer.link_pfp) {
        await supabase.storage.from('customers').remove([customer.link_pfp]).catch(() => {});
      }
      const { error } = await supabase.from('customers').delete().eq('id', customer.id);
      if (error) throw error;
      await fetchCustomers();
    } catch (err) {
      console.error(err);
      alert('Xoá thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 sm:space-y-8">
        <div className="page-header sm:mb-2">
          <div className="page-header-main">
            <div className="page-header-icon">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="page-header-title">Quản lý bệnh nhân</h2>
              <p className="page-header-subtitle">Thêm, sửa và xem phiếu điều trị</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddNewCustomer}
            className="btn-primary inline-flex items-center gap-2 px-4"
          >
            <UserPlus className="h-4 w-4" />
            Thêm bệnh nhân
          </button>
        </div>

        <div className="card-portal overflow-hidden p-0">
          <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-3 sm:px-6 sm:py-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800 sm:text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Tất cả bệnh nhân
            </h3>
          </div>
          {customers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 sm:p-12">Chưa có bệnh nhân.</div>
          ) : (
            <>
              {/* Mobile: card layout */}
              <div className="divide-y divide-gray-100 p-4 md:hidden">
                {customers.map((customer) => (
                  <div key={customer.id} className="py-4 first:pt-0">
                    <div className="flex gap-3">
                      <div className="shrink-0">
                        {customer.pfp_url ? (
                          <img src={customer.pfp_url} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-100" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-sm text-gray-500">—</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800">{customer.full_name}</p>
                        <p className="text-sm text-gray-600">{customer.phone}</p>
                        <p className="mt-1 text-xs text-gray-500">{customer.birth_year ? `Năm sinh: ${customer.birth_year}` : ''} {customer.note ? `• ${customer.note}` : ''}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(customer)}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-200"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(customer)}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Xóa
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/patient/${customer.id}/incidents`)}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                          >
                            <FileText className="h-3.5 w-3.5" /> Phiếu
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-sm font-medium text-gray-600">
                      <th className="px-4 py-3 sm:px-6 sm:py-4">Ảnh</th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4">Họ tên</th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4">Năm sinh</th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4">Số điện thoại</th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4">Ghi chú</th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50/50">
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                          {customer.pfp_url ? (
                            <img src={customer.pfp_url} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-100" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500">—</div>
                          )}
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 font-medium text-gray-800">{customer.full_name}</td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-gray-600">{customer.birth_year || '—'}</td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-gray-600">{customer.phone}</td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-500 sm:px-6 sm:py-4">{customer.note || '—'}</td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(customer)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-200"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(customer)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Xóa
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/patient/${customer.id}/incidents`)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                            >
                              <FileText className="h-3.5 w-3.5" /> Phiếu điều trị
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {editingId ? 'Cập nhật bệnh nhân' : 'Thêm bệnh nhân mới'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {editingId ? 'Chỉnh sửa thông tin bệnh nhân.' : 'Nhập thông tin bệnh nhân mới.'}
                    </p>
                  </div>
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
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Họ và tên</label>
                    <input
                      type="text"
                      placeholder="Họ và tên"
                      required
                      className="input-portal"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Năm sinh</label>
                    <input
                      type="date"
                      className="input-portal"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="Số điện thoại"
                    required
                    className="input-portal"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Thông tin sức khỏe</label>
                  <textarea
                    placeholder="Thông tin sức khỏe"
                    className="input-portal min-h-[80px] resize-y"
                    value={formData.healthInfo}
                    onChange={(e) => setFormData({ ...formData, healthInfo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Ảnh đại diện</label>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
                      <ImagePlus className="h-4 w-4" />
                      Chọn ảnh
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                    {previewUrl && (
                      <img src={previewUrl} alt="Xem trước" className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-200" />
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary">
                    {editingId
                      ? loading
                        ? 'Đang cập nhật...'
                        : 'Cập nhật bệnh nhân'
                      : loading
                        ? 'Đang lưu...'
                        : 'Thêm bệnh nhân'}
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

export default Customers;
