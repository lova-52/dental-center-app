// src/pages/admin/inventory/ItemForm.jsx
import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import { fetchCategories, createItem, updateItem, uploadItemImage } from './inventoryService';

Modal.setAppElement('#root');

const UNITS = ['1','bao','bộ','cái', 'can', 'cặp','chai','e','gói','hộp','kim','lọ','ml','l','ống','trụ', 'túi', 'tuýp', 'g', 'kg', 'cây', 'cuộn', 'tép'];

const ItemForm = ({ initialData = null, onClose, onSaved }) => {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    code: '',
    name: '',
    category_id: '',
    unit: '',
    price: '',
    stock_min: '',
    qty_on_hand: '',
    note: '',
    image_file: null,
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchCategories();
      setCategories(data || []);
    };
    load();

    if (initialData) {
      setForm({
        code: initialData.code || '',
        name: initialData.name || '',
        category_id: initialData.category_id || '',
        unit: initialData.unit || '',
        price: initialData.price || '',
        stock_min: initialData.stock_min || '',
        qty_on_hand: initialData.qty_on_hand || '', // ⭐
        note: initialData.note || '',
        image_file: null,
      });
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // validation
    if (!form.name) { alert('Tên vật tư là bắt buộc'); return; }
    const payload = {
      code: form.code || null,
      name: form.name,
      category_id: form.category_id || null,
      unit: form.unit || null,
      price: form.price ? Number(form.price) : 0,
      stock_min: form.stock_min ? Number(form.stock_min) : null,
      qty_on_hand: form.qty_on_hand ? Number(form.qty_on_hand) : null,
      note: form.note || null,
    };

    try {
      if (initialData) {
        await updateItem(initialData.id, payload);
        if (form.image_file) {
          const { path } = await uploadItemImage(form.image_file, initialData.id);
          await updateItem(initialData.id, { image_path: path });
        }
      } else {
        const { data, error } = await createItem(payload).select().single();
        if (error) throw error;
        const created = data;
        if (form.image_file) {
          const { path } = await uploadItemImage(form.image_file, created.id);
          await updateItem(created.id, { image_path: path });
        }
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      alert('Lỗi lưu vật tư: ' + (err.message || JSON.stringify(err)));
    }
  };

  return (
    <Modal isOpen onRequestClose={onClose} overlayClassName="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50" className="bg-white rounded-xl w-full max-w-2xl mt-10 p-6 max-h-[90vh] overflow-auto">
      <h3 className="text-lg font-semibold mb-4">{initialData ? 'Sửa vật tư' : 'Thêm vật tư'}</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm">Tên vật tư</label>
          <input className="input-portal" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Mã vật tư</label>
            <input className="input-portal" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm">Đơn vị</label>
            <select className="input-portal" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
              <option value="">Chọn đơn vị</option>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Nhóm</label>
            <select className="input-portal" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Chọn nhóm</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm">Đơn giá</label>
            <input type="number" step="0.01" className="input-portal" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Định mức tồn kho</label>
            <input type="number" className="input-portal" value={form.stock_min} onChange={e => setForm({ ...form, stock_min: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm">Số lượng tồn hiện tại</label>
            <input
              type="number"
              className="input-portal"
              value={form.qty_on_hand}
              onChange={e => setForm({ ...form, qty_on_hand: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm">Ảnh</label>
            <input type="file" accept="image/*" onChange={e => setForm({ ...form, image_file: e.target.files?.[0] })} />
          </div>
        </div>

        <div>
          <label className="block text-sm">Ghi chú</label>
          <textarea className="input-portal" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Hủy</button>
          <button type="submit" className="px-4 py-2 bg-primary text-white rounded">{initialData ? 'Cập nhật' : 'Thêm'}</button>
        </div>
      </form>
    </Modal>
  );
};

export default ItemForm;