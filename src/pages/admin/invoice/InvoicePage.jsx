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
  id: item.id || (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
  item_name: item.item_name || '',
  unit: item.unit || '',
  quantity: item.quantity ?? 1,
  unit_price: item.unit_price ?? 0,
  tax_rate: item.tax_rate ?? 0,
  sort_order: item.sort_order ?? 0,
});

const calcTotals = (items, vatPercent) => {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
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
      .select(`
        *,
        invoice_items (*)
      `)
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
      items: prev.items.length === 1 ? [makeItem()] : prev.items.filter((item) => item.id !== id),
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
          amount: Number(item.quantity || 0) * Number(item.unit_price || 0),
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
        const { data: createdInvoice, error: createError } = await supabase
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
    }, 100);
  };

  const printInvoiceData = useMemo(() => {
    if (!printInvoice) return null;

    const items = (printInvoice.invoice_items || []).slice().sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    );

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
                          {STATUS_OPTIONS.find((s) => s.value === invoice.status)?.label || invoice.status}
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

        {isModalOpen && (
          <div className="no-print fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingId ? 'Cập nhật hóa đơn' : 'Tạo hóa đơn mới'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Nhập thủ công từng dòng dịch vụ hoặc vật phẩm
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Số hóa đơn
                    </label>
                    <input
                      type="text"
                      value={formData.invoice_no}
                      disabled={!editingId}
                      className="input-portal"
                      placeholder="Tự sinh khi lưu"
                      onChange={(e) => updateField('invoice_no', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Ngày hóa đơn
                    </label>
                    <input
                      type="date"
                      className="input-portal"
                      value={formData.invoice_date}
                      onChange={(e) => updateField('invoice_date', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Trạng thái
                    </label>
                    <select
                      className="input-portal"
                      value={formData.status}
                      onChange={(e) => updateField('status', e.target.value)}
                    >
                      {STATUS_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Tên khách hàng
                    </label>
                    <input
                      type="text"
                      className="input-portal"
                      value={formData.buyer_name}
                      onChange={(e) => updateField('buyer_name', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      className="input-portal"
                      value={formData.buyer_phone}
                      onChange={(e) => updateField('buyer_phone', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      CCCD
                    </label>
                    <input
                      type="text"
                      className="input-portal"
                      value={formData.buyer_cccd}
                      onChange={(e) => updateField('buyer_cccd', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Mã số thuế
                    </label>
                    <input
                      type="text"
                      className="input-portal"
                      value={formData.buyer_tax_code}
                      onChange={(e) => updateField('buyer_tax_code', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Hình thức thanh toán
                    </label>
                    <select
                      className="input-portal"
                      value={formData.payment_method}
                      onChange={(e) => updateField('payment_method', e.target.value)}
                    >
                      {PAYMENT_METHODS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Tên ngân hàng
                    </label>
                    <input
                      type="text"
                      className="input-portal"
                      value={formData.bank_name}
                      onChange={(e) => updateField('bank_name', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Số tài khoản
                    </label>
                    <input
                      type="text"
                      className="input-portal"
                      value={formData.bank_account}
                      onChange={(e) => updateField('bank_account', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Người bán / lập hóa đơn
                    </label>
                    <input
                      type="text"
                      className="input-portal"
                      value={formData.seller_name}
                      onChange={(e) => updateField('seller_name', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      VAT (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      className="input-portal"
                      value={formData.vat_percent}
                      onChange={(e) => updateField('vat_percent', e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Địa chỉ
                    </label>
                    <input
                      type="text"
                      className="input-portal"
                      value={formData.buyer_address}
                      onChange={(e) => updateField('buyer_address', e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Ghi chú
                    </label>
                    <textarea
                      className="input-portal min-h-[90px] resize-y"
                      value={formData.note}
                      onChange={(e) => updateField('note', e.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200">
                  <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
                    <h4 className="text-sm font-semibold text-gray-800">
                      Dòng hóa đơn
                    </h4>
                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                    >
                      <Plus className="h-4 w-4" />
                      Thêm dòng
                    </button>
                  </div>

                  <div className="space-y-4 p-4">
                    {formData.items.map((item, index) => (
                      <div
                        key={item.id}
                        className="grid gap-3 rounded-xl bg-gray-50 p-3 lg:grid-cols-[2fr_120px_100px_140px_100px_44px]"
                      >
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">
                            Nội dung
                          </label>
                          <input
                            type="text"
                            className="input-portal"
                            value={item.item_name}
                            onChange={(e) =>
                              updateItem(item.id, 'item_name', e.target.value)
                            }
                            placeholder="Tên dịch vụ / vật phẩm"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">
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
                          <label className="mb-1 block text-xs font-medium text-gray-500">
                            Số lượng
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="input-portal"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(item.id, 'quantity', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">
                            Đơn giá
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            className="input-portal"
                            value={item.unit_price}
                            onChange={(e) =>
                              updateItem(item.id, 'unit_price', e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">
                            VAT dòng
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            className="input-portal"
                            value={item.tax_rate}
                            onChange={(e) =>
                              updateItem(item.id, 'tax_rate', e.target.value)
                            }
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-700 hover:bg-red-200"
                            title="Xóa dòng"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="lg:col-span-6">
                          <div className="text-xs text-gray-500">
                            Thành tiền: {money(Number(item.quantity || 0) * Number(item.unit_price || 0))} đ
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700 sm:grid-cols-3">
                  <div className="flex items-center justify-between">
                    <span>Tạm tính</span>
                    <span className="font-semibold">{money(previewTotals.subtotal)} đ</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>VAT</span>
                    <span className="font-semibold">{money(previewTotals.vatAmount)} đ</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tổng cộng</span>
                    <span className="font-semibold text-primary">{money(previewTotals.totalAmount)} đ</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3 pt-2">
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
                    {saving ? 'Đang lưu...' : editingId ? 'Cập nhật hóa đơn' : 'Lưu hóa đơn'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {printInvoiceData && (
          <div className="print-only hidden print:block">
            <div className="mx-auto w-[210mm] min-h-[297mm] bg-white p-[14mm] text-[12px] text-black">
              <div className="mb-5 text-center">
                <div className="text-xl font-bold uppercase">
                  HÓA ĐƠN GIÁ TRỊ GIA TĂNG
                </div>
                <div className="mt-1 text-sm italic">(Nội bộ)</div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div><span className="font-semibold">Số hóa đơn:</span> {printInvoiceData.invoice_no}</div>
                  <div><span className="font-semibold">Ngày:</span> {printInvoiceData.invoice_date}</div>
                  <div><span className="font-semibold">Khách hàng:</span> {printInvoiceData.buyer_name || '—'}</div>
                  <div><span className="font-semibold">SĐT:</span> {printInvoiceData.buyer_phone || '—'}</div>
                  <div><span className="font-semibold">CCCD:</span> {printInvoiceData.buyer_cccd || '—'}</div>
                  <div><span className="font-semibold">MST:</span> {printInvoiceData.buyer_tax_code || '—'}</div>
                </div>
                <div>
                  <div><span className="font-semibold">Hình thức thanh toán:</span> {printInvoiceData.payment_method || '—'}</div>
                  <div><span className="font-semibold">Ngân hàng:</span> {printInvoiceData.bank_name || '—'}</div>
                  <div><span className="font-semibold">Số tài khoản:</span> {printInvoiceData.bank_account || '—'}</div>
                  <div><span className="font-semibold">Người lập:</span> {printInvoiceData.seller_name || '—'}</div>
                  <div><span className="font-semibold">Địa chỉ:</span> {printInvoiceData.buyer_address || '—'}</div>
                </div>
              </div>

              <div className="mt-6">
                <table className="w-full border-collapse border border-black text-sm">
                  <thead>
                    <tr>
                      <th className="border border-black p-2 text-left">STT</th>
                      <th className="border border-black p-2 text-left">Tên hàng hóa, dịch vụ</th>
                      <th className="border border-black p-2 text-center">ĐVT</th>
                      <th className="border border-black p-2 text-right">Số lượng</th>
                      <th className="border border-black p-2 text-right">Đơn giá</th>
                      <th className="border border-black p-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printInvoiceData.items.map((item, index) => (
                      <tr key={item.id}>
                        <td className="border border-black p-2">{index + 1}</td>
                        <td className="border border-black p-2">{item.item_name}</td>
                        <td className="border border-black p-2 text-center">{item.unit || '—'}</td>
                        <td className="border border-black p-2 text-right">{item.quantity}</td>
                        <td className="border border-black p-2 text-right">{money(item.unit_price)}</td>
                        <td className="border border-black p-2 text-right">
                          {money(Number(item.quantity || 0) * Number(item.unit_price || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 ml-auto w-full max-w-[420px] space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Tổng tiền chưa có thuế GTGT:</span>
                  <span>{money(printInvoiceData.totals.subtotal)} đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Tiền thuế GTGT ({printInvoiceData.vat_percent || 0}%):</span>
                  <span>{money(printInvoiceData.totals.vatAmount)} đ</span>
                </div>
                <div className="flex justify-between border-t border-black pt-1 font-semibold">
                  <span>Tổng cộng tiền thanh toán:</span>
                  <span>{money(printInvoiceData.totals.totalAmount)} đ</span>
                </div>
              </div>

              <div className="mt-6 text-sm">
                <div><span className="font-semibold">Số tiền viết bằng chữ:</span> ....................................................</div>
              </div>

              <div className="mt-16 grid grid-cols-2 gap-8 text-center text-sm">
                <div>
                  <div className="font-semibold">Người mua hàng</div>
                  <div className="mt-16">(Ký, ghi rõ họ tên)</div>
                </div>
                <div>
                  <div className="font-semibold">Người bán hàng</div>
                  <div className="mt-16">(Ký, ghi rõ họ tên)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
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
            }

            .no-print {
              display: none !important;
            }

            @page {
              size: A4;
              margin: 0;
            }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
};

export default InvoicePage;