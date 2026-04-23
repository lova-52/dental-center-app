// src/pages/admin/inventory/Items.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchItems, deleteItem, getPublicUrl } from "./inventoryService";
import ItemForm from "./ItemForm";
import AdminLayout from "../../../components/AdminLayout";
import { Boxes, Plus, Pencil, Trash2, Search, Package, Filter, Download, ArrowRight, ImageIcon } from "lucide-react";

const Items = () => {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await fetchItems();
    setItems(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Xoá vật tư?")) return;
    await deleteItem(id);
    await load();
  };

  const filtered = items.filter(
    (i) =>
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="page-shell">
        <div className="page-header">
          <div className="page-header-main">
            <div className="page-header-icon">
              <Boxes className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h2 className="page-header-title">Danh mục vật tư</h2>
              <p className="page-header-subtitle">Quản lý danh sách vật tư trong kho</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="btn-primary inline-flex items-center gap-2 px-4"
          >
            <Plus className="h-4 w-4" />
            Thêm mới
          </button>
        </div>

        <div className="card-portal overflow-hidden p-0">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Package className="h-4 w-4 text-primary" />
                Tất cả vật tư
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm tên hoặc mã vật tư..."
                    className="input-portal w-full min-w-[200px] pl-9 pr-3 py-2.5"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select className="input-portal w-auto min-h-[44px] py-2.5 pl-3 pr-8">
                  <option>Hoạt động</option>
                  <option>Ngừng</option>
                </select>
                <button className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5">
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <Link
                  to="/admin/inventory/categories"
                  className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5"
                >
                  <Filter className="h-4 w-4" />
                  Nhóm vật tư
                </Link>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Đang hiển thị {filtered.length}/{items.length} vật tư.
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Boxes className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-600">Không tìm thấy vật tư</p>
              <p className="mt-1 text-xs text-slate-500">Thử thay đổi từ khoá tìm kiếm</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="table-head-row">
                <tr>
                  <th className="table-head-cell">Trạng thái</th>
                  <th className="table-head-cell">Ảnh</th>
                  <th className="table-head-cell">Mã vật tư</th>
                  <th className="table-head-cell">Tên vật tư</th>
                  <th className="table-head-cell">Đơn vị</th>
                  <th className="table-head-cell">Đơn giá</th>
                  <th className="table-head-cell">Định mức tồn</th>
                  <th className="table-head-cell">Số lượng tồn</th>
                  <th className="table-head-cell">Ghi chú</th>
                  <th className="table-head-cell text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((it) => {
                  const url = it.image_path ? getPublicUrl(it.image_path) : null;
                  const isLowStock = Number(it.qty_on_hand || 0) < Number(it.stock_min || 0);

                  return (
                    <tr key={it.id} className="table-row">
                      <td className="table-cell">
                        <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      </td>
                      <td className="table-cell w-16">
                        {url ? (
                          <img src={url} alt="" className="h-12 w-12 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 border border-slate-200">
                            <ImageIcon className="h-5 w-5 text-slate-400" />
                          </div>
                        )}
                      </td>
                      <td className="table-cell font-medium text-slate-800">{it.code || '—'}</td>
                      <td className="table-cell text-slate-700">{it.name}</td>
                      <td className="table-cell text-slate-500">{it.unit || '—'}</td>
                      <td className="table-cell text-slate-700">{Number(it.price || 0).toLocaleString('vi-VN')} ₫</td>
                      <td className="table-cell text-slate-500">{it.stock_min || 0}</td>
                      <td className="table-cell">
                        <span className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-slate-700'}`}>
                          {Number(it.qty_on_hand || 0)}
                        </span>
                      </td>
                      <td className="table-cell text-slate-500 max-w-[150px] truncate">{it.note || <span className="text-slate-400">—</span>}</td>
                      <td className="table-cell text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-200"
                            onClick={() => {
                              setEditing(it);
                              setShowForm(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Sửa
                          </button>
                          <button
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
                            onClick={() => handleDelete(it.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xoá
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {showForm && (
          <ItemForm
            initialData={editing}
            onClose={() => {
              setShowForm(false);
              load();
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default Items;