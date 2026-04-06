// src/pages/admin/inventory/MovementForm.jsx
import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import { createStockMovement } from './inventoryService';

Modal.setAppElement('#root');

const MovementForm = ({ type = 'in', suppliers = [], items = [], initialData = null, onClose, onSaved }) => {
  const [form, setForm] = useState({
    movement_date: new Date().toISOString().slice(0,16),
    supplier_id: '',
    note: '',
  });
  const [chosen, setChosen] = useState([]); // { item_id, qty, unit_price, expiry_date }
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    setSearchResults(items || []);
  }, [items]);

  useEffect(() => {
    if (initialData) {
      setForm({
        movement_date: (initialData.movement_date || initialData.created_at || new Date()).slice(0,16),
        supplier_id: initialData.supplier_id || '',
        note: initialData.note || '',
      });
      const existing = (initialData.movement_items || []).map(mi => ({
        item_id: mi.item_id,
        qty: Number(mi.qty),
        unit_price: Number(mi.unit_price),
        expiry_date: mi.expiry_date || '',
      }));
      setChosen(existing);
    } else {
      setChosen([]);
    }
  }, [initialData]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) return setSearchResults(items || []);
    setSearchResults((items || []).filter(i => (i.name || '').toLowerCase().includes(q) || (i.code || '').toLowerCase().includes(q)));
  }, [query, items]);

  const addItem = (it) => {
    if (chosen.find(c => c.item_id === it.id)) return;
    setChosen([...chosen, { item_id: it.id, qty: 1, unit_price: Number(it.price || 0), expiry_date: '' }]);
  };

  const removeItem = (item_id) => setChosen(chosen.filter(c => c.item_id !== item_id));
  const updateLine = (item_id, patch) => setChosen(chosen.map(c => c.item_id === item_id ? { ...c, ...patch } : c));

  const total = chosen.reduce((s, c) => s + (Number(c.qty || 0) * Number(c.unit_price || 0)), 0);

  const validate = () => {
    if (type === 'in' && !form.supplier_id) { alert('Vui lòng chọn nhà cung cấp'); return false; }
    if (chosen.length === 0) { alert('Chọn ít nhất 1 vật tư'); return false; }
    if (chosen.some(c => !(Number(c.qty) > 0))) { alert('Số lượng phải > 0'); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const movementPayload = {
      movement_type: type,
      code: `MV-${Date.now()}`,
      movement_date: new Date(form.movement_date).toISOString(),
      supplier_id: type === 'in' ? form.supplier_id : null,
      total_amount: total,
      note: form.note,
      created_by: null, // optionally: set to current user id
    };

    const itemsPayload = chosen.map(c => ({
      item_id: c.item_id,
      qty: Number(c.qty),
      unit_price: Number(c.unit_price),
      expiry_date: c.expiry_date || null,
      note: c.note || ''
    }));

    try {
      await createStockMovement(movementPayload, itemsPayload);
      onSaved?.();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi lưu phiếu: ' + (err.message || err.error || JSON.stringify(err)));
    }
  };

  return (
    <Modal isOpen onRequestClose={onClose} overlayClassName="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50" className="bg-white rounded-xl w-full max-w-5xl mt-10 p-6 max-h-[90vh] overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Phiếu {type === 'in' ? 'Nhập' : 'Xuất'}</h3>
        <div className="text-sm text-gray-500">Tổng: <strong>{total.toLocaleString('vi-VN')}</strong> VNĐ</div>
      </div>

      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm">Ngày lập</label>
            <input type="datetime-local" value={form.movement_date} onChange={(e) => setForm({ ...form, movement_date: e.target.value })} className="input-portal" />
          </div>

          {type === 'in' && (
            <div>
              <label className="block text-sm">Nhà cung cấp</label>
              <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} className="input-portal">
                <option value="">Chọn nhà cung cấp</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm">Ghi chú</label>
          <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="input-portal" />
        </div>

        <div className="border-t pt-3">
          <h4 className="font-semibold mb-2">Chọn vật tư</h4>
          <div className="flex gap-3 items-center mb-3">
            <input placeholder="Tìm vật tư..." value={query} onChange={(e) => setQuery(e.target.value)} className="input-portal flex-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="h-64 overflow-auto border rounded p-2">
                {searchResults.map(i => (
                  <div key={i.id} className="flex items-center justify-between border-b py-2">
                    <div>
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-gray-500">{i.code} • {i.unit}</div>
                    </div>
                    <div>
                      <button onClick={() => addItem(i)} className="px-3 py-1 bg-primary text-white rounded">Chọn</button>
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && <div className="text-sm text-gray-500">Không tìm thấy</div>}
              </div>
            </div>

            <div>
              <div className="h-64 overflow-auto border rounded p-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th>STT</th><th>Tên</th><th>Số lượng</th><th>Đơn giá</th><th>Thành</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {chosen.map((c, idx) => {
                      const meta = items.find(it => it.id === c.item_id) || {};
                      return (
                        <tr key={c.item_id} className="border-b">
                          <td className="py-2">{idx + 1}</td>
                          <td>{meta.name}</td>
                          <td>
                            <input type="number" min="0" step="0.01" value={c.qty} onChange={e => updateLine(c.item_id, { qty: e.target.value })} className="w-20 p-1 border rounded" />
                          </td>
                          <td>
                            <input type="number" min="0" step="0.01" value={c.unit_price} onChange={e => updateLine(c.item_id, { unit_price: e.target.value })} className="w-28 p-1 border rounded" />
                          </td>
                          <td>{(Number(c.qty || 0) * Number(c.unit_price || 0)).toLocaleString('vi-VN')}</td>
                          <td><button className="text-red-600" onClick={() => removeItem(c.item_id)}>Xóa</button></td>
                        </tr>
                      );
                    })}
                    {chosen.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-500">Chưa có vật tư</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Huỷ</button>
          <button onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded">Lưu phiếu</button>
        </div>
      </div>
    </Modal>
  );
};

export default MovementForm;