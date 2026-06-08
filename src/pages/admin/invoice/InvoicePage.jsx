// path: src/pages/admin/invoice/InvoicePage.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../../components/AdminLayout';
import { supabase } from '../../../lib/supabase';
import {
  CalendarDays,
  FileText,
  Plus,
  Printer,
  ReceiptText,
  Trash2,
  X,
  Pencil,
  User,
  Phone,
  BadgeDollarSign,
  Building2,
  Banknote,
} from 'lucide-react';

const PAYMENT_METHODS = [
  'Tiền mặt',
  'Chuyển khoản',
  'Quẹt thẻ',
  'Công nợ',
  'Khác',
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Nháp' },
  { value: 'issued', label: 'Đã phát hành' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const money = (value) =>
  new Intl.NumberFormat('vi-VN').format(Number(value || 0));

const todayISO = () => new Date().toISOString().slice(0, 10);

const makeItem = (item = {}) => ({
  id:
    item.id ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`),
  item_name: item.item_name || '',
  unit: item.unit || '',
  quantity: item.quantity ?? 1,
  unit_price: item.unit_price ?? 0,
  tax_rate: item.tax_rate ?? 0,
  sort_order: item.sort_order ?? 0,
});

const calcTotals = (items, vatPercent) => {
  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      Number(item.quantity || 0) * Number(item.unit_price || 0),
    0
  );

  const vatAmount = subtotal * (Number(vatPercent || 0) / 100);
  const totalAmount = subtotal + vatAmount;

  return {
    subtotal,
    vatAmount,
    totalAmount,
  };
};


const VIET_DIGITS = [
  'không',
  'một',
  'hai',
  'ba',
  'bốn',
  'năm',
  'sáu',
  'bảy',
  'tám',
  'chín',
];

const readThreeDigits = (num, full = false) => {
  const n = Number(num) || 0;
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;

  const parts = [];

  if (hundreds > 0 || full) {
    parts.push(`${VIET_DIGITS[hundreds]} trăm`);
  }

  if (tens > 1) {
    parts.push(`${VIET_DIGITS[tens]} mươi`);
    if (ones === 1) parts.push('mốt');
    else if (ones === 5) parts.push('lăm');
    else if (ones > 0) parts.push(VIET_DIGITS[ones]);
  } else if (tens === 1) {
    parts.push('mười');
    if (ones === 5) parts.push('lăm');
    else if (ones > 0) parts.push(VIET_DIGITS[ones]);
  } else if (ones > 0) {
    if (hundreds > 0 || full) parts.push('lẻ');
    parts.push(VIET_DIGITS[ones]);
  }

  return parts.join(' ');
};

const numberToVietnameseWords = (value) => {
  const num = Math.max(0, Math.floor(Number(value || 0)));

  if (num === 0) return 'Không đồng';

  const scales = ['', ' nghìn', ' triệu', ' tỷ'];
  const groups = [];
  let n = num;

  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }

  const parts = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    const full = i < groups.length - 1 && g < 100;
    parts.push(readThreeDigits(g, full) + (scales[i] || ''));
  }

  const sentence = parts.join(' ').replace(/\s+/g, ' ').trim();
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ' đồng';
};

const getStatusLabel = (value) => {
  return (
    STATUS_OPTIONS.find((item) => item.value === value)?.label ||
    value ||
    '—'
  );
};

const InvoicePage = () => {
  const navigate = useNavigate();
  const { patientId } = useParams();

  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [printInvoice, setPrintInvoice] = useState(null);

  const [formData, setFormData] = useState({
    invoice_date: todayISO(),
    invoice_no: '',
    buyer_name: '',
    buyer_phone: '',
    buyer_cccd: '',
    buyer_tax_code: '',
    buyer_address: '',
    payment_method: 'Tiền mặt',
    bank_name: '',
    bank_account: '',
    seller_name: '',
    note: '',
    vat_percent: 0,
    status: 'draft',
    items: [makeItem()],
  });

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintInvoice(null);
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const fetchCustomer = useCallback(async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name, phone, note, status')
      .eq('id', patientId)
      .single();

    if (error) throw error;

    setCustomer(data || null);
    return data || null;
  }, [patientId]);

  const fetchInvoices = useCallback(async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select(
        `
        *,
        invoice_items (*)
      `
      )
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    setInvoices(data || []);
  }, [patientId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const c = await fetchCustomer();
      await fetchInvoices();

      setFormData((prev) => ({
        ...prev,
        buyer_name: prev.buyer_name || c?.full_name || '',
        buyer_phone: prev.buyer_phone || c?.phone || '',
      }));
    } catch (err) {
      console.error(err);
      alert('Không tải được dữ liệu hóa đơn.');
    } finally {
      setLoading(false);
    }
  }, [fetchCustomer, fetchInvoices]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      invoice_date: todayISO(),
      invoice_no: '',
      buyer_name: customer?.full_name || '',
      buyer_phone: customer?.phone || '',
      buyer_cccd: '',
      buyer_tax_code: '',
      buyer_address: '',
      payment_method: 'Tiền mặt',
      bank_name: '',
      bank_account: '',
      seller_name: '',
      note: '',
      vat_percent: 0,
      status: 'draft',
      items: [makeItem()],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (invoice) => {
    const items = (invoice.invoice_items || [])
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((item) => makeItem(item));

    setEditingId(invoice.id);
    setFormData({
      invoice_date: invoice.invoice_date || todayISO(),
      invoice_no: invoice.invoice_no || '',
      buyer_name: invoice.buyer_name || '',
      buyer_phone: invoice.buyer_phone || '',
      buyer_cccd: invoice.buyer_cccd || '',
      buyer_tax_code: invoice.buyer_tax_code || '',
      buyer_address: invoice.buyer_address || '',
      payment_method: invoice.payment_method || 'Tiền mặt',
      bank_name: invoice.bank_name || '',
      bank_account: invoice.bank_account || '',
      seller_name: invoice.seller_name || '',
      note: invoice.note || '',
      vat_percent: Number(invoice.vat_percent || 0),
      status: invoice.status || 'draft',
      items: items.length ? items : [makeItem()],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateItem = (id, key, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      ),
    }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, makeItem({ sort_order: prev.items.length })],
    }));
  };

  const removeItem = (id) => {
    setFormData((prev) => ({
      ...prev,
      items:
        prev.items.length === 1
          ? [makeItem()]
          : prev.items.filter((item) => item.id !== id),
    }));
  };

  const previewTotals = useMemo(() => {
    return calcTotals(formData.items, formData.vat_percent);
  }, [formData.items, formData.vat_percent]);

  const generateInvoiceNo = async (invoiceDate) => {
    const date = new Date(invoiceDate || todayISO());
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dayKey = `${date.getFullYear()}-${mm}-${dd}`;

    const { count, error } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('invoice_date', dayKey);

    if (error) throw error;

    const seq = String((count || 0) + 1).padStart(3, '0');
    return `HD-${yy}${mm}${dd}-${seq}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const cleanItems = formData.items
        .filter((item) => String(item.item_name || '').trim())
        .map((item, index) => ({
          item_name: String(item.item_name || '').trim(),
          unit: String(item.unit || '').trim(),
          quantity: Number(item.quantity || 0),
          unit_price: Number(item.unit_price || 0),
          tax_rate: Number(item.tax_rate || 0),
          amount:
            Number(item.quantity || 0) *
            Number(item.unit_price || 0),
          sort_order: index,
        }));

      if (cleanItems.length === 0) {
        alert('Hóa đơn cần ít nhất 1 dòng.');
        return;
      }

      const totals = calcTotals(cleanItems, formData.vat_percent);

      let invoiceNo = formData.invoice_no;

      if (!editingId) {
        invoiceNo = await generateInvoiceNo(formData.invoice_date);
      }

      const payload = {
        invoice_no: invoiceNo,
        patient_id: patientId,
        invoice_date: formData.invoice_date,
        buyer_name: formData.buyer_name,
        buyer_phone: formData.buyer_phone,
        buyer_cccd: formData.buyer_cccd,
        buyer_tax_code: formData.buyer_tax_code,
        buyer_address: formData.buyer_address,
        payment_method: formData.payment_method,
        bank_name: formData.bank_name,
        bank_account: formData.bank_account,
        seller_name: formData.seller_name,
        note: formData.note,
        vat_percent: Number(formData.vat_percent || 0),
        subtotal: totals.subtotal,
        vat_amount: totals.vatAmount,
        total_amount: totals.totalAmount,
        status: formData.status,
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('invoices')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;

        const { error: deleteItemsError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', editingId);

        if (deleteItemsError) throw deleteItemsError;

        const itemsPayload = cleanItems.map((item) => ({
          ...item,
          invoice_id: editingId,
        }));

        const { error: insertItemsError } = await supabase
          .from('invoice_items')
          .insert(itemsPayload);

        if (insertItemsError) throw insertItemsError;
      } else {
        const { data: createdInvoice, error: createError } =
          await supabase
            .from('invoices')
            .insert([{ ...payload, invoice_no: invoiceNo }])
            .select()
            .single();

        if (createError) throw createError;

        const itemsPayload = cleanItems.map((item) => ({
          ...item,
          invoice_id: createdInvoice.id,
        }));

        const { error: insertItemsError } = await supabase
          .from('invoice_items')
          .insert(itemsPayload);

        if (insertItemsError) throw insertItemsError;
      }

      await fetchInvoices();
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Lưu hóa đơn thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (invoice) => {
    if (!window.confirm(`Xóa hóa đơn ${invoice.invoice_no}?`)) return;

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoice.id);

    if (error) {
      console.error(error);
      alert('Xóa hóa đơn thất bại.');
      return;
    }

    await fetchInvoices();
  };

  const handlePrint = (invoice) => {
    setPrintInvoice(invoice);

    setTimeout(() => {
      window.print();
    }, 250);
  };

  const printInvoiceData = useMemo(() => {
    if (!printInvoice) return null;

    const items = (printInvoice.invoice_items || [])
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const totals = calcTotals(items, printInvoice.vat_percent);

    return {
      ...printInvoice,
      items,
      totals,
    };
  }, [printInvoice]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="no-print page-header">
          <div className="page-header-main">
            <div className="page-header-icon">
              <ReceiptText className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h2 className="page-header-title">Hóa đơn nội bộ</h2>
              <p className="page-header-subtitle">
                Khách hàng: {customer?.full_name || '—'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/patients')}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Quay lại
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="btn-primary inline-flex items-center gap-2 px-4"
            >
              <Plus className="h-4 w-4" />
              Tạo hóa đơn
            </button>
          </div>
        </div>

        {/* LIST */}
        <div className="no-print card-portal overflow-hidden p-0">
          <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-gray-800">
                Danh sách hóa đơn
              </h3>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Có {invoices.length} hóa đơn
            </p>
          </div>

          {invoices.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              Chưa có hóa đơn nào
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {invoice.invoice_no}
                        </h4>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : invoice.status === 'issued'
                              ? 'bg-blue-100 text-blue-700'
                              : invoice.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {getStatusLabel(invoice.status)}
                        </span>
                      </div>

                      <div className="mt-2 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-gray-400" />
                          {invoice.invoice_date || '—'}
                        </div>
                        <div className="flex items-center gap-2">
                          <BadgeDollarSign className="h-4 w-4 text-gray-400" />
                          {money(invoice.total_amount)} đ
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {invoice.buyer_name || '—'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {invoice.buyer_phone || '—'}
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-gray-500">
                        {invoice.note || ''}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(invoice)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrint(invoice)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        In
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(invoice)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL */}
        {isModalOpen && (
          <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-3 py-4 sm:px-4">
            <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              {/* modal header */}
              <div className="shrink-0 border-b border-gray-100 px-5 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingId
                        ? 'Cập nhật hóa đơn'
                        : 'Tạo hóa đơn mới'}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Nhập thủ công từng dòng dịch vụ / vật phẩm, sau đó in theo mẫu nội bộ
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* modal body */}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* top info blocks */}
                  <div className="grid gap-4 xl:grid-cols-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <FileText className="h-4 w-4 text-primary" />
                        Thông tin hóa đơn
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Số hóa đơn
                          </label>
                          <input
                            type="text"
                            value={formData.invoice_no}
                            disabled={!editingId}
                            className="input-portal"
                            placeholder="Tự sinh khi lưu"
                            onChange={(e) =>
                              updateField('invoice_no', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Ngày hóa đơn
                          </label>
                          <input
                            type="date"
                            className="input-portal"
                            value={formData.invoice_date}
                            onChange={(e) =>
                              updateField('invoice_date', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Trạng thái
                          </label>
                          <select
                            className="input-portal"
                            value={formData.status}
                            onChange={(e) =>
                              updateField('status', e.target.value)
                            }
                          >
                            {STATUS_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            VAT (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            className="input-portal"
                            value={formData.vat_percent}
                            onChange={(e) =>
                              updateField('vat_percent', e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4 xl:col-span-2">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <User className="h-4 w-4 text-primary" />
                        Thông tin người mua
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Tên khách hàng
                          </label>
                          <input
                            type="text"
                            className="input-portal"
                            value={formData.buyer_name}
                            onChange={(e) =>
                              updateField('buyer_name', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Số điện thoại
                          </label>
                          <input
                            type="text"
                            className="input-portal"
                            value={formData.buyer_phone}
                            onChange={(e) =>
                              updateField('buyer_phone', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            CCCD
                          </label>
                          <input
                            type="text"
                            className="input-portal"
                            value={formData.buyer_cccd}
                            onChange={(e) =>
                              updateField('buyer_cccd', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Mã số thuế
                          </label>
                          <input
                            type="text"
                            className="input-portal"
                            value={formData.buyer_tax_code}
                            onChange={(e) =>
                              updateField('buyer_tax_code', e.target.value)
                            }
                          />
                        </div>

                        <div className="md:col-span-2 xl:col-span-2">
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Địa chỉ
                          </label>
                          <input
                            type="text"
                            className="input-portal"
                            value={formData.buyer_address}
                            onChange={(e) =>
                              updateField('buyer_address', e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 xl:col-span-1">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <Banknote className="h-4 w-4 text-primary" />
                        Thanh toán
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Hình thức thanh toán
                          </label>
                          <select
                            className="input-portal"
                            value={formData.payment_method}
                            onChange={(e) =>
                              updateField('payment_method', e.target.value)
                            }
                          >
                            {PAYMENT_METHODS.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Tên ngân hàng
                          </label>
                          <input
                            type="text"
                            className="input-portal"
                            value={formData.bank_name}
                            onChange={(e) =>
                              updateField('bank_name', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Số tài khoản
                          </label>
                          <input
                            type="text"
                            className="input-portal"
                            value={formData.bank_account}
                            onChange={(e) =>
                              updateField('bank_account', e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4 xl:col-span-2">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <Building2 className="h-4 w-4 text-primary" />
                        Người lập hóa đơn / ghi chú
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Người bán / lập hóa đơn
                          </label>
                          <input
                            type="text"
                            className="input-portal"
                            value={formData.seller_name}
                            onChange={(e) =>
                              updateField('seller_name', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Ghi chú ngắn
                          </label>
                          <input
                            type="text"
                            className="input-portal"
                            value={formData.note}
                            onChange={(e) =>
                              updateField('note', e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* items */}
                  <div className="rounded-2xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-5">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800">
                          Dòng hóa đơn
                        </h4>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Nhập thủ công từng dịch vụ/vật phẩm theo deal riêng của khách
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={addItem}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                      >
                        <Plus className="h-4 w-4" />
                        Thêm dòng
                      </button>
                    </div>

                    <div className="space-y-3 p-4 sm:p-5">
                      {formData.items.map((item, index) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Dòng {index + 1}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Xóa dòng
                            </button>
                          </div>

                          <div className="grid gap-3 lg:grid-cols-[2.2fr_0.8fr_0.8fr_1fr_0.8fr]">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-600">
                                Nội dung
                              </label>
                              <input
                                type="text"
                                className="input-portal"
                                value={item.item_name}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    'item_name',
                                    e.target.value
                                  )
                                }
                                placeholder="Tên dịch vụ / vật phẩm"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-600">
                                ĐVT
                              </label>
                              <input
                                type="text"
                                className="input-portal"
                                value={item.unit}
                                onChange={(e) =>
                                  updateItem(item.id, 'unit', e.target.value)
                                }
                                placeholder="Lần"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-600">
                                Số lượng
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                className="input-portal"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    'quantity',
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-600">
                                Đơn giá
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                className="input-portal"
                                value={item.unit_price}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    'unit_price',
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-600">
                                VAT dòng
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                className="input-portal"
                                value={item.tax_rate}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    'tax_rate',
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                            <span>
                              Thành tiền dòng:{' '}
                              <span className="font-medium text-gray-700">
                                {money(
                                  Number(item.quantity || 0) *
                                    Number(item.unit_price || 0)
                                )}{' '}
                                đ
                              </span>
                            </span>
                            <span>
                              {item.tax_rate ? `VAT dòng: ${item.tax_rate}%` : 'Không VAT dòng'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* totals */}
                  <div className="grid gap-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-3">
                    <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
                      <span>Tạm tính</span>
                      <span className="font-semibold">
                        {money(previewTotals.subtotal)} đ
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3">
                      <span>VAT</span>
                      <span className="font-semibold">
                        {money(previewTotals.vatAmount)} đ
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
                      <span className="font-medium text-gray-800">
                        Tổng cộng
                      </span>
                      <span className="font-semibold text-primary">
                        {money(previewTotals.totalAmount)} đ
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Hủy
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary"
                    >
                      {saving
                        ? 'Đang lưu...'
                        : editingId
                        ? 'Cập nhật hóa đơn'
                        : 'Lưu hóa đơn'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* PRINT */}
        {printInvoiceData && (
          <div className="print-only hidden print:block">
            <div className="receipt-paper">
              <div className="receipt-frame">
                <div className="receipt-header">
                  <div className="receipt-company-name">
                    NHA KHOA PHƯƠNG SEN
                  </div>
                  <div className="receipt-company-line">
                    Số 92, Đường số 7, KDC CityLand, Phường Hạnh Thông, TP. HCM
                  </div>
                  <div className="receipt-company-line">
                    ĐT: 0287.108.4226
                  </div>

                  <div className="receipt-divider">
                    -----------------------------
                  </div>

                  <div className="receipt-title">
                    HÓA ĐƠN THANH TOÁN
                  </div>

                  <div className="receipt-meta">
                    <div>
                      Số HD:{' '}
                      <strong>{printInvoiceData.invoice_no || '0002'}</strong>
                    </div>
                    <div>
                      Ngày in:{' '}
                      {new Date(
                        printInvoiceData.invoice_date || todayISO()
                      ).toLocaleDateString('vi-VN')}
                    </div>
                    <div>
                      Giờ in:{' '}
                      {new Date().toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  </div>

                  <div className="receipt-meta receipt-meta-grid">
                    <div className="receipt-meta-label">Bàn:</div>
                    <div className="receipt-meta-value">
                      {printInvoiceData.note || '...'}
                    </div>

                    <div className="receipt-meta-label">Thu ngân:</div>
                    <div className="receipt-meta-value">
                      {printInvoiceData.seller_name || 'ADMIN'}
                    </div>

                    <div className="receipt-meta-label">Khách hàng:</div>
                    <div className="receipt-meta-value">
                      {printInvoiceData.buyer_name ||
                        customer?.full_name ||
                        'Khách lẻ'}
                    </div>
                  </div>
                </div>

                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th className="receipt-col-name">TÊN HÀNG</th>
                      <th className="receipt-col-qty">SL</th>
                      <th className="receipt-col-price">Đơn Giá</th>
                      <th className="receipt-col-amount">T.TIỀN</th>
                    </tr>
                  </thead>

                  <tbody>
                    {printInvoiceData.items.map((item, index) => {
                      const qty = Number(item.quantity || 0);
                      const price = Number(item.unit_price || 0);
                      const amount = qty * price;

                      return (
                        <tr key={item.id || index}>
                          <td className="receipt-item-name">
                            {index + 1}) {item.item_name || ''}
                          </td>
                          <td className="text-center">{qty || ''}</td>
                          <td className="text-right">
                            {item.unit_price ? money(price) : ''}
                          </td>
                          <td className="text-right">{money(amount)}</td>
                        </tr>
                      );
                    })}

                    <tr className="receipt-total-row">
                      <td colSpan="3" className="receipt-total-label">
                        Tạm tính
                      </td>
                      <td className="text-right">
                        {money(printInvoiceData.totals.subtotal)}
                      </td>
                    </tr>

                    <tr>
                      <td colSpan="3" className="receipt-total-label">
                        VAT {printInvoiceData.vat_percent || 10}%
                      </td>
                      <td className="text-right">
                        {money(printInvoiceData.totals.vatAmount)}
                      </td>
                    </tr>

                    <tr className="receipt-grand-total">
                      <td colSpan="3" className="receipt-total-label">
                        TỔNG CỘNG
                      </td>
                      <td className="text-right">
                        {money(printInvoiceData.totals.totalAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="receipt-pay-line">
                  <span className="receipt-pay-label">
                    {String(printInvoiceData.payment_method || 'TIỀN MẶT').toUpperCase()}
                  </span>
                  <span className="receipt-pay-value">
                    {money(printInvoiceData.totals.totalAmount)}
                  </span>
                </div>

                <div className="receipt-words">
                  {numberToVietnameseWords(printInvoiceData.totals.totalAmount)}
                </div>

                <div className="receipt-footer">
                  Cảm Ơn Quý Khách - Hẹn Gặp Lại
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .input-portal {
            width: 100%;
            border-radius: 0.75rem;
            border: 1px solid rgb(229 231 235);
            background: white;
            padding: 0.65rem 0.85rem;
            font-size: 0.875rem;
            outline: none;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
          }

          .input-portal:focus {
            border-color: rgb(59 130 246);
            box-shadow: 0 0 0 3px rgb(59 130 246 / 0.12);
          }

          .input-portal:disabled {
            background: rgb(249 250 251);
            color: rgb(107 114 128);
          }

          .receipt-paper{
            width: 80mm;
            margin: 0 auto;
            padding: 4mm 3mm 6mm;
            background: #fff;
            color: #222;
            font-family: Arial, Helvetica, sans-serif;
          }

          .receipt-frame{
            width: 100%;
            text-align: center;
          }

          .receipt-header{
            font-size: 10px;
            line-height: 1.25;
          }

          .receipt-company-name{
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.2px;
            margin-top: 2px;
            text-transform: uppercase;
          }

          .receipt-company-line{
            margin-top: 2px;
          }

          .receipt-divider{
            margin: 4px 0 8px;
            letter-spacing: 1px;
          }

          .receipt-title{
            font-size: 12px;
            font-weight: 700;
            margin: 2px 0 4px;
            text-transform: uppercase;
          }

          .receipt-meta{
            font-size: 10px;
            margin-top: 2px;
          }

          .receipt-meta-grid{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2px 6px;
            text-align: left;
            margin-top: 4px;
          }

          .receipt-meta-label{
            font-weight: 700;
          }

          .receipt-meta-value{
            text-align: right;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .receipt-table{
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 9.5px;
          }

          .receipt-table th,
          .receipt-table td{
            padding: 2px 2px;
            vertical-align: top;
          }

          .receipt-table thead th{
            border-bottom: 1px solid #333;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9px;
          }

          .receipt-col-name{
            text-align: left;
            width: 48%;
          }

          .receipt-col-qty{
            width: 10%;
            text-align: center;
          }

          .receipt-col-price{
            width: 20%;
            text-align: right;
          }

          .receipt-col-amount{
            width: 22%;
            text-align: right;
          }

          .receipt-item-name{
            text-align: left;
            padding-left: 0;
            word-break: break-word;
          }

          .receipt-table tbody tr td{
            border-bottom: 1px dotted #bbb;
          }

          .receipt-total-row td{
            border-bottom: none !important;
            padding-top: 4px;
            font-weight: 700;
          }

          .receipt-total-label{
            text-align: left;
          }

          .receipt-pay-line{
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-top: 4px;
            padding-top: 2px;
          }

          .receipt-pay-label{
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.2px;
            text-transform: uppercase;
          }

          .receipt-pay-value{
            font-size: 16px;
            font-weight: 700;
          }

          .receipt-words{
            margin-top: 4px;
            font-style: italic;
            text-align: left;
            font-size: 10px;
            line-height: 1.35;
          }

          .receipt-footer{
            margin-top: 10px;
            font-size: 11px;
            text-align: center;
            font-weight: 700;
          }

          .receipt-grand-total td{
            border-top:1px solid #000;
            padding-top:4px;
            font-weight:700;
            font-size:11px;
          }

          .receipt-total-label{
            text-align:left;
          }

          @media print {
            body * {
              visibility: hidden !important;
            }

            .print-only,
            .print-only * {
              visibility: visible !important;
            }

            .print-only {
              display: block !important;
              position: absolute !important;
              inset: 0 !important;
              background: #fff !important;
            }

            .print-only .receipt-paper{
              width: 80mm;
              margin: 0 auto;
              padding: 4mm 3mm 6mm;
            }

            .no-print {
              display: none !important;
            }

            @page {
              size: 80mm auto;
              margin: 0;
            }

            body {
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background: white;
            }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
};

export default InvoicePage;