// src/pages/admin/inventory/StockMovements.jsx
import React, { useEffect, useState } from 'react';
import MovementForm from './MovementForm';
import { fetchStockMovements, fetchSuppliers, fetchItems, deleteStockMovement } from './inventoryService';

const StockMovements = () => {
  const [tab, setTab] = useState('in');
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    load();
  }, [tab]);

  const load = async () => {
    const { data: mdata, error: merr } = await fetchStockMovements(tab);
    if (!merr) setMovements(mdata || []);
    const { data: sdata } = await fetchSuppliers();
    setSuppliers(sdata || []);
    const { data: idata } = await fetchItems();
    setItems(idata || []);
  };

  const openNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleSave = async (movementPayload, itemsList) => {
    // call createStockMovement from parent via MovementForm onSave -> handled in MovementForm via prop
    // we just reload after movement created
    await load();
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá phiếu?')) return;
    await deleteStockMovement(id);
    await load();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Phiếu Nhập/Xuất</h2>
          <div className="text-sm text-gray-500">Quản lý phiếu nhập / xuất vật tư</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTab('in')}
            className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              tab === 'in' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Phiếu nhập
          </button>
          <button
            onClick={() => setTab('out')}
            className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              tab === 'out' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Phiếu xuất
          </button>
          <button onClick={openNew} className="btn-primary sm:ml-2">Thêm phiếu</button>
        </div>
      </header>

      <div className="card-portal overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="p-3">Mã phiếu</th>
              <th className="p-3">Ngày</th>
              <th className="p-3">Người lập</th>
              <th className="p-3">Nhà cung cấp</th>
              <th className="p-3">Tổng tiền</th>
              <th className="p-3">Ghi chú</th>
              <th className="p-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">Chưa có phiếu</td></tr>
            )}
            {movements.map(m => (
              <tr key={m.id} className="border-t">
                <td className="p-3 font-medium text-gray-900">{m.code}</td>
                <td className="p-3">{new Date(m.movement_date).toLocaleString('vi-VN')}</td>
                <td className="p-3">{m.profiles?.full_name || '—'}</td>
                <td className="p-3">{m.suppliers?.name || '—'}</td>
                <td className="p-3">{Number(m.total_amount || 0).toLocaleString('vi-VN')}</td>
                <td className="p-3">{m.note || '—'}</td>
                <td className="p-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setEditing(m); setShowForm(true); }} className="font-medium text-blue-600 hover:text-blue-700">Xem / Sửa</button>
                    <button onClick={() => handleDelete(m.id)} className="font-medium text-red-600 hover:text-red-700">Xoá</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <MovementForm
          type={tab}
          suppliers={suppliers}
          items={items}
          initialData={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { load(); setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
};

export default StockMovements;