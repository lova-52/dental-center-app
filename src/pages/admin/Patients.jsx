// path: src/pages/admin/Patients.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  FileText,
  ImagePlus,
  Search,
  ArrowUpDown,
  X,
  CalendarDays,
  Cake,
  Phone,
  StickyNote,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Khách tiềm năng' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'in care', label: 'Đang điều trị' },
  { value: 'done', label: 'Đã hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const normalizeStatus = (status) => {
  const value = String(status || 'lead').trim().toLowerCase();

  if (value === 'incare') return 'in care';
  if (value === 'in care') return 'in care';
  if (value === 'confirmed') return 'confirmed';
  if (value === 'done') return 'done';
  if (value === 'cancelled') return 'cancelled';
  if (value === 'lead') return 'lead';

  return 'lead';
};

const getStatusStyle = (status) => {
  switch (normalizeStatus(status)) {
    case 'lead':
      return 'bg-blue-100 text-blue-700 ring-blue-200';
    case 'confirmed':
      return 'bg-emerald-100 text-emerald-700 ring-emerald-200';
    case 'in care':
      return 'bg-violet-100 text-violet-700 ring-violet-200';
    case 'done':
      return 'bg-green-100 text-green-700 ring-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-700 ring-red-200';
    default:
      return 'bg-gray-100 text-gray-600 ring-gray-200';
  }
};

const getStatusLabel = (status) => {
  const found = STATUS_OPTIONS.find(
    (item) => item.value === normalizeStatus(status)
  );
  return found?.label || '—';
};

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    contact: '',
    healthInfo: '',
    appointment_date: '',
    status: 'lead',
  });
  const [editingId, setEditingId] = useState(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at_desc');
  const navigate = useNavigate();

  const location = useLocation();
    const statusFromQuery = new URLSearchParams(location.search).get('status');
    const statusFilter = statusFromQuery
      ? normalizeStatus(statusFromQuery)
      : '';

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `c${Date.now()}`;
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
      (data || []).map(async (c) => {
        if (c.link_pfp) {
          const { data: urlData } = supabase.storage
            .from('customers')
            .getPublicUrl(c.link_pfp);
          c.pfp_url = urlData?.publicUrl || c.link_pfp;
        } else {
          c.pfp_url = null;
        }

        c.status = normalizeStatus(c.status);

        return c;
      })
    );

    setCustomers(mapped);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      dob: '',
      contact: '',
      healthInfo: '',
      appointment_date: '',
      status: 'lead',
    });
    setEditingId(null);
    setFile(null);
    setPreviewUrl(null);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);

    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(URL.createObjectURL(f));
  };

  const uploadFileToSupabase = async (fileToUpload, customerId) => {
    if (!fileToUpload) return null;

    const ext = fileToUpload.name.split('.').pop();
    const filename = `${customerId || generateId()}_${Date.now()}.${ext}`;
    const filePath = `customers/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('customers')
      .upload(filePath, fileToUpload, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('customers')
      .getPublicUrl(filePath);

    return { path: filePath, publicUrl: urlData?.publicUrl || null };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const birthYear = formData.dob
        ? new Date(formData.dob).getFullYear()
        : null;

      const normalizedStatus = normalizeStatus(formData.status);

      if (editingId) {
        const updates = {
          full_name: formData.name,
          birth_year: birthYear,
          phone: formData.contact,
          note: formData.healthInfo,
          appointment_date: formData.appointment_date || null,
          status: normalizedStatus,
        };

        if (file) {
          const res = await uploadFileToSupabase(file, editingId);
          updates.link_pfp = res.path;
        }

        const { error } = await supabase
          .from('customers')
          .update(updates)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const newId = generateId();
        let link_pfp_path = null;

        if (file) {
          const res = await uploadFileToSupabase(file, newId);
          link_pfp_path = res.path;
        }

        const { error } = await supabase.from('customers').insert([
          {
            id: newId,
            full_name: formData.name,
            birth_year: birthYear,
            phone: formData.contact,
            note: formData.healthInfo,
            appointment_date: formData.appointment_date || null,
            status: normalizedStatus,
            link_pfp: link_pfp_path,
          },
        ]);

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
      appointment_date: customer.appointment_date || '',
      status: normalizeStatus(customer.status),
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
        await supabase.storage
          .from('customers')
          .remove([customer.link_pfp])
          .catch(() => {});
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (error) throw error;

      await fetchCustomers();
    } catch (err) {
      console.error(err);
      alert('Xoá thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (customerId, newStatus) => {
    const normalizedStatus = normalizeStatus(newStatus);

    setStatusUpdatingId(customerId);

    const previousCustomers = customers;

    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === customerId
          ? { ...customer, status: normalizedStatus }
          : customer
      )
    );

    try {
      const { error } = await supabase
        .from('customers')
        .update({ status: normalizedStatus })
        .eq('id', customerId);

      if (error) throw error;
    } catch (err) {
      console.error(err);
      alert('Cập nhật trạng thái thất bại.');
      setCustomers(previousCustomers);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);

    if (isNaN(date)) return '—';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const getDateValue = (value) => {
    if (!value) return null;

    const t = new Date(`${value}T00:00:00`).getTime();

    return Number.isNaN(t) ? null : t;
  };

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const filtered = customers.filter((customer) => {
      if (!q) {
        return !statusFilter || normalizeStatus(customer.status) === statusFilter;
      }

      const haystack = [
        customer.full_name,
        customer.phone,
        customer.note,
        customer.appointment_date,
        customer.birth_year ? String(customer.birth_year) : '',
        getStatusLabel(customer.status),
        customer.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = haystack.includes(q);
      const matchesStatus = !statusFilter || normalizeStatus(customer.status) === statusFilter;

      return matchesSearch && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name_asc' || sortBy === 'name_desc') {
        const av = (a.full_name || '').trim().toLowerCase();
        const bv = (b.full_name || '').trim().toLowerCase();

        const result = av.localeCompare(bv, 'vi', {
          sensitivity: 'base',
        });

        return sortBy === 'name_asc' ? result : -result;
      }

      if (
        sortBy === 'appointment_date_asc' ||
        sortBy === 'appointment_date_desc'
      ) {
        const av = getDateValue(a.appointment_date);
        const bv = getDateValue(b.appointment_date);

        if (av === null && bv === null) return 0;
        if (av === null)
          return sortBy === 'appointment_date_asc' ? 1 : -1;
        if (bv === null)
          return sortBy === 'appointment_date_asc' ? -1 : 1;

        return sortBy === 'appointment_date_asc' ? av - bv : bv - av;
      }

      const av = getDateValue(a.created_at) || 0;
      const bv = getDateValue(b.created_at) || 0;

      return bv - av;
    });

    return sorted;
  }, [customers, searchTerm, sortBy]);

  return (
    <AdminLayout>
      <div className="space-y-6 sm:space-y-8">
        <div className="page-header sm:mb-2">
          <div className="page-header-main">
            <div className="page-header-icon">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>

            <div className="min-w-0">
              <h2 className="page-header-title">
                Quản lý bệnh nhân
              </h2>

              <p className="page-header-subtitle">
                Thêm, sửa, tìm kiếm và sắp xếp khách hàng
              </p>
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
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800 sm:text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Tất cả bệnh nhân
              </h3>

              <div className="grid gap-3 lg:w-[760px] lg:grid-cols-[1fr_220px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) =>
                      setSearchTerm(e.target.value)
                    }
                    placeholder="Tìm theo tên, SĐT, ghi chú..."
                    className="input-portal w-full pl-9 pr-9"
                  />

                  {searchTerm ? (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      aria-label="Xóa tìm kiếm"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="relative">
                  <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input-portal w-full appearance-none pl-9"
                  >
                    <option value="created_at_desc">
                      Mới thêm nhất
                    </option>

                    <option value="name_asc">
                      Tên A → Z
                    </option>

                    <option value="name_desc">
                      Tên Z → A
                    </option>

                    <option value="appointment_date_asc">
                      Ngày tư vấn cũ → mới
                    </option>

                    <option value="appointment_date_desc">
                      Ngày tư vấn mới → cũ
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Đang hiển thị {filteredCustomers.length}/
              {customers.length} khách hàng.
            </p>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 sm:p-12">
              {customers.length === 0
                ? 'Chưa có bệnh nhân.'
                : 'Không tìm thấy khách hàng phù hợp.'}
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="divide-y divide-gray-100 p-4 md:hidden">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="py-4 first:pt-0"
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0">
                        {customer.pfp_url ? (
                          <img
                            src={customer.pfp_url}
                            alt=""
                            className="h-14 w-14 rounded-full object-cover ring-2 ring-gray-100"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-sm text-gray-500">
                            —
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-800">
                              {customer.full_name}
                            </p>

                            <div className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                              <Phone className="h-3.5 w-3.5 text-gray-400" />
                              <span>{customer.phone || '—'}</span>
                            </div>
                          </div>

                          <select
                            value={normalizeStatus(customer.status)}
                            onChange={(e) =>
                              handleStatusChange(
                                customer.id,
                                e.target.value
                              )
                            }
                            disabled={
                              statusUpdatingId === customer.id
                            }
                            className={`inline-flex shrink-0 rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold ring-1 outline-none transition-colors ${getStatusStyle(
                              customer.status
                            )}`}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* IMPROVED MOBILE INFO */}
                        <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-3">
                          <div className="flex items-center gap-2 text-xs text-gray-700">
                            <Cake className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium">
                              Năm sinh:
                            </span>
                            <span>
                              {customer.birth_year || '—'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-700">
                            <CalendarDays className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium">
                              Ngày tư vấn:
                            </span>
                            <span>
                              {formatDate(
                                customer.appointment_date
                              )}
                            </span>
                          </div>

                          <div className="flex items-start gap-2 text-xs text-gray-700">
                            <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />

                            <div className="min-w-0">
                              <span className="font-medium">
                                Ghi chú:
                              </span>

                              <p className="mt-0.5 whitespace-pre-wrap break-words leading-5 text-gray-600">
                                {customer.note || '—'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(customer)}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-200"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Sửa
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(customer)
                            }
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xóa
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/admin/patient/${customer.id}/incidents`
                              )
                            }
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Phiếu
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[72px]" />
                    <col className="w-[200px]" />
                    <col className="w-[120px]" />
                    <col className="w-[180px]" />
                    <col className="w-[360px]" />
                    <col className="w-[280px]" />
                  </colgroup>

                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-sm font-medium text-gray-600">
                      <th className="px-4 py-3 sm:px-6 sm:py-4">
                        Ảnh
                      </th>

                      <th className="px-4 py-3 sm:px-6 sm:py-4">
                        Họ tên
                      </th>

                      <th className="px-4 py-3 sm:px-6 sm:py-4">
                        Ngày tư vấn
                      </th>

                      <th className="px-4 py-3 sm:px-6 sm:py-4">
                        Trạng thái
                      </th>

                      <th className="px-4 py-3 sm:px-6 sm:py-4">
                        Ghi chú
                      </th>

                      <th className="px-4 py-3 sm:px-6 sm:py-4 text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50/50"
                      >
                        <td className="px-4 py-4 sm:px-6 sm:py-4 align-top">
                          {customer.pfp_url ? (
                            <img
                              src={customer.pfp_url}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-100"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500">
                              —
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4 sm:px-6 sm:py-4 align-top">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-800">
                              {customer.full_name}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-gray-500">
                              <span className="block truncate">
                                {customer.phone || '—'}
                              </span>

                              <span className="block">
                                Năm sinh:{' '}
                                {customer.birth_year || '—'}
                              </span>
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-4 sm:px-6 sm:py-4 align-top text-sm text-gray-600">
                          {formatDate(customer.appointment_date)}
                        </td>

                        <td className="px-4 py-4 sm:px-6 sm:py-4 align-top">
                          <select
                            value={normalizeStatus(customer.status)}
                            onChange={(e) =>
                              handleStatusChange(
                                customer.id,
                                e.target.value
                              )
                            }
                            disabled={
                              statusUpdatingId === customer.id
                            }
                            className={`w-full max-w-[180px] rounded-full border-0 px-3 py-1.5 text-xs font-semibold ring-1 outline-none transition-colors ${getStatusStyle(
                              customer.status
                            )}`}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-4 py-4 sm:px-6 sm:py-4 align-top">
                          <div className="whitespace-normal break-words text-sm leading-6 text-gray-600">
                            {customer.note || '—'}
                          </div>
                        </td>

                        <td className="px-4 py-4 sm:px-6 sm:py-4 align-top">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(customer)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-200"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Sửa
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(customer)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Xóa
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/patient/${customer.id}/incidents`
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Phiếu điều trị
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
            <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl sm:p-8">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UserPlus className="h-4 w-4" />
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {editingId
                        ? 'Cập nhật bệnh nhân'
                        : 'Thêm bệnh nhân mới'}
                    </h3>

                    <p className="text-xs text-gray-500">
                      {editingId
                        ? 'Chỉnh sửa thông tin bệnh nhân.'
                        : 'Nhập thông tin bệnh nhân mới.'}
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

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Họ và tên
                    </label>

                    <input
                      type="text"
                      placeholder="Họ và tên"
                      required
                      className="input-portal"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Năm sinh
                    </label>

                    <input
                      type="date"
                      className="input-portal"
                      value={formData.dob}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dob: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Ngày tư vấn lần đầu
                    </label>

                    <input
                      type="date"
                      className="input-portal"
                      value={formData.appointment_date}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          appointment_date:
                            e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Số điện thoại
                    </label>

                    <input
                      type="text"
                      placeholder="Số điện thoại"
                      required
                      className="input-portal"
                      value={formData.contact}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contact: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
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
                    {STATUS_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Thông tin sức khỏe
                  </label>

                  <textarea
                    placeholder="Thông tin sức khỏe"
                    className="input-portal min-h-[80px] resize-y"
                    value={formData.healthInfo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        healthInfo: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Ảnh đại diện
                  </label>

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
                      <ImagePlus className="h-4 w-4" />
                      Chọn ảnh

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Xem trước"
                        className="h-16 w-16 rounded-full object-cover ring-2 ring-gray-200"
                      />
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
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