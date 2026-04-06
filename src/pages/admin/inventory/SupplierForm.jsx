// src/pages/admin/inventory/SupplierForm.jsx
import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import { createSupplier, updateSupplier } from './inventoryService';

Modal.setAppElement('#root');

const SupplierForm = ({ initialData = null, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: '', contact_name: '', phone: '', email: '', address: '', note: '' });

  useEffect(() => {
    if (initialData) setForm({
      name: initialData.name || '',
      contact_name: initialData.contact_name || '',
      phone: initialData.phone || '',
      email: initialData.email || '',
      address: initialData.address || '',
      note: initialData.note || '',
    });
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { alert('Tên nhà cung cấp là bắt buộc'); return; }
    try {
      if (initialData) {
        await updateSupplier(initialData.id, form);
      } else {
        await createSupplier(form);
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      alert('Lỗi lưu nhà cung cấp: ' + (err.message || JSON.stringify(err)));
    }
  };

  return (
    <Modal isOpen onRequestClose={onClose} className="bg-white rounded-xl w-full max-w-md mt-10 p-6" overlayClassName="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50">
      <h3 className="text-lg font-semibold mb-4">{initialData ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm">Nhà cung cấp</label>
          <input className="input-portal" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>

        <div>
          <label className="block text-sm">Người liên hệ</label>
          <input className="input-portal" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Điện thoại</label>
            <input className="input-portal" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm">Email</label>
            <input className="input-portal" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="block text-sm">Địa chỉ</label>
          <input className="input-portal" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm">Ghi chú</label>
          <textarea className="input-portal" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Hủy</button>
          <button type="submit" className="px-4 py-2 bg-primary text-white rounded">Lưu</button>
        </div>
      </form>
    </Modal>
  );
};

export default SupplierForm;