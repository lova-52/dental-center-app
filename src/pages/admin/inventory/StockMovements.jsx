// src/pages/admin/inventory/StockMovements.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MovementForm from './MovementForm';
import { fetchStockMovements, fetchSuppliers, fetchItems, deleteStockMovement } from './inventoryService';
import AdminLayout from '../../../components/AdminLayout';
import { Package, Plus, Pencil, Trash2, ArrowLeft, ArrowDownCircle, ArrowUpCircle, Receipt } from 'lucide-react';

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
    <AdminLayout>
      <div className="page-shell">
        <div className="page-header">
          <div className="page-header-main">
            <div className="page-header-icon">
              <Receipt className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h2 className="page-header-title">Phiếu Nhập / Xuất</h2>
              <p className="page-header-subtitle">Quản lý phiếu nhập / xuất vật tư</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/inventory/items" className="btn-secondary inline-flex items-center gap-2 px-4">
              <ArrowLeft className="h-4 w-4" />
              Danh mục vật tư
            </Link>
            <button
              onClick={openNew}
              className="btn-primary inline-flex items-center gap-2 px-4"
            >
              <Plus className="h-4 w-4" />
              Thêm phiếu
            </button>
          </div>
        </div>

        <div className="card-portal overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <button
              onClick={() => setTab('in')}
              className={`inline-flex items-center gap-2 min-h-[40px] rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                tab === 'in'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ArrowDownCircle className="h-4 w-4" />
              Phiếu nhập
            </button>
            <button
              onClick={() => setTab('out')}
              className={`inline-flex items-center gap-2 min-h-[40px] rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                tab === 'out'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ArrowUpCircle className="h-4 w-4" />
              Phiếu xuất
            </button>
          </div>

          {movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Package className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-600">Chưa có phiếu</p>
              <p className="mt-1 text-xs text-slate-500">Tạo phiếu {tab === 'in' ? 'nhập' : 'xuất'} mới</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="table-head-row">
                <tr>
                  <th className="table-head-cell">Mã phiếu</th>
                  <th className="table-head-cell">Ngày</th>
                  <th className="table-head-cell">Người lập</th>
                  <th className="table-head-cell">Nhà cung cấp</th>
                  <th className="table-head-cell">Tổng tiền</th>
                  <th className="table-head-cell">Ghi chú</th>
                  <th className="table-head-cell text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map(m => (
                  <tr key={m.id} className="table-row">
                    <td className="table-cell font-medium text-slate-800">{m.code}</td>
                    <td className="table-cell text-slate-600">{new Date(m.movement_date).toLocaleString('vi-VN')}</td>
                    <td className="table-cell text-slate-600">{m.profiles?.full_name || <span className="text-slate-400">—</span>}</td>
                    <td className="table-cell text-slate-600">{m.suppliers?.name || <span className="text-slate-400">—</span>}</td>
                    <td className="table-cell font-semibold text-primary">{Number(m.total_amount || 0).toLocaleString('vi-VN')} ₫</td>
                    <td className="table-cell text-slate-500">{m.note || <span className="text-slate-400">—</span>}</td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => { setEditing(m); setShowForm(true); }}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-200"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xoá
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
    </AdminLayout>
  );
};

export default StockMovements;