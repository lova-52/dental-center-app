// src/pages/admin/inventory/Items.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchItems, deleteItem, getPublicUrl } from "./inventoryService";
import ItemForm from "./ItemForm";

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
    <div className="space-y-6">
      {/* HEADER */}
      <div className="page-header">
        <div className="page-header-main">
          <div className="page-header-icon">
            <span className="text-sm font-semibold">VT</span>
          </div>
          <div className="min-w-0">
            <h2 className="page-header-title">Danh mục vật tư</h2>
            <p className="page-header-subtitle">Quản lý danh sách vật tư trong kho</p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="btn-primary px-4"
        >
          Thêm mới
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="toolbar">
        <input
          placeholder="Nhập tên hoặc mã vật tư để tìm kiếm"
          className="toolbar-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select className="toolbar-select">
          <option>Hoạt động</option>
          <option>Ngừng</option>
        </select>

        <button className="toolbar-button">
          Export
        </button>

        <Link
          to="/admin/inventory/categories"
          className="toolbar-button"
        >
          Nhóm vật tư
        </Link>
      </div>

      {/* TABLE */}
      <div className="table-card">
        <table className="w-full text-sm">
          {/* HEADER */}
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

          {/* BODY */}
          <tbody className="bg-white">

            {filtered.map((it) => {
              const url = it.image_path ? getPublicUrl(it.image_path) : null;

              return (
                <tr key={it.id} className="table-row">

                  {/* STATUS */}
                  <td className="table-cell">
                    <input type="checkbox" defaultChecked />
                  </td>

                  {/* IMAGE */}
                  <td className="table-cell w-20">
                    {url ? (
                      <img
                        src={url}
                        alt=""
                        className="h-12 w-12 rounded object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-slate-100 border border-slate-200" />
                    )}
                  </td>

                  {/* CODE */}
                  <td className="table-cell font-medium">{it.code}</td>

                  {/* NAME */}
                  <td className="table-cell">{it.name}</td>

                  {/* UNIT */}
                  <td className="table-cell">{it.unit}</td>

                  {/* PRICE */}
                  <td className="table-cell">
                    {Number(it.price || 0).toLocaleString("vi-VN")}
                  </td>

                  {/* MIN STOCK */}
                  <td className="table-cell">{it.stock_min || 0}</td>

                  {/* QTY */}
                  <td className="table-cell font-semibold">{Number(it.qty_on_hand || 0)}</td>

                  {/* NOTE */}
                  <td className="table-cell text-gray-500">
                    {it.note || ""}
                  </td>

                  {/* ACTION */}
                  <td className="table-cell text-center">
                    <div className="flex justify-center gap-3">

                      <button
                        className="text-primary hover:text-primary/80"
                        onClick={() => {
                          setEditing(it);
                          setShowForm(true);
                        }}
                      >
                        ✏️
                      </button>

                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(it.id)}
                      >
                        🗑
                      </button>

                    </div>
                  </td>

                </tr>
              );
            })}

          </tbody>
        </table>
      </div>

      {/* FORM */}
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
  );
};

export default Items;