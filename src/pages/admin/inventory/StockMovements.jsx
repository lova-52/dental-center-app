import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/AdminLayout';
import MovementForm from './MovementForm';
import {
  fetchStockMovements,
  fetchSuppliers,
  fetchItems,
  deleteStockMovement,
} from './inventoryService';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  BadgeInfo,
  Warehouse,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

const TAB_META = {
  in: {
    label: 'Phiếu nhập',
    icon: ArrowDownCircle,
    tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    emptyHint: 'Tạo phiếu nhập mới',
  },
  out: {
    label: 'Phiếu xuất',
    icon: ArrowUpCircle,
    tone: 'bg-rose-50 text-rose-700 ring-rose-200',
    emptyHint: 'Tạo phiếu xuất mới',
  },
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('vi-VN');

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN');
};

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

const StockMovements = () => {
  const [tab, setTab] = useState('in');
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingDeleteId, setSavingDeleteId] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const load = async () => {
    setLoading(true);
    try {
      const [mres, sres, ires] = await Promise.all([
        fetchStockMovements(tab),
        fetchSuppliers(),
        fetchItems(),
      ]);

      const { data: mdata, error: merr } = mres || {};
      const { data: sdata } = sres || {};
      const { data: idata } = ires || {};

      if (!merr) setMovements(mdata || []);
      setSuppliers(sdata || []);
      setItems(idata || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá phiếu?')) return;

    setSavingDeleteId(id);
    try {
      await deleteStockMovement(id);
      await load();
    } catch (err) {
      console.error(err);
      alert('Xoá phiếu thất bại.');
    } finally {
      setSavingDeleteId(null);
    }
  };

  const currentMeta = TAB_META[tab];

  const stats = useMemo(() => {
    const countIn = movements.filter((m) => String(m.type || tab) === 'in').length;
    const countOut = movements.filter((m) => String(m.type || tab) === 'out').length;
    const totalValue = movements.reduce((sum, m) => sum + Number(m.total_amount || 0), 0);

    return {
      countIn,
      countOut,
      totalValue,
    };
  }, [movements, tab]);

  return (
    <AdminLayout>
      <div className="space-y-6 sm:space-y-8">
        <div className="page-header">
          <div className="page-header-main">
            <div className="page-header-icon">
              <Receipt className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="page-header-title">Phiếu Nhập / Xuất</h2>
              <p className="page-header-subtitle">
                Quản lý phiếu nhập / xuất vật tư, tối ưu cho cả desktop và mobile.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              to="/inventory/items"
              className="btn-secondary inline-flex items-center gap-2 px-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Danh mục vật tư
            </Link>

            <button
              type="button"
              onClick={openNew}
              className="btn-primary inline-flex items-center gap-2 px-4"
            >
              <Plus className="h-4 w-4" />
              Thêm phiếu
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={Warehouse}
            label="Tổng phiếu"
            value={movements.length}
            tone="bg-slate-100 text-slate-700"
          />
          <StatCard
            icon={TrendingUp}
            label="Phiếu nhập"
            value={stats.countIn}
            tone="bg-emerald-100 text-emerald-700"
          />
          <StatCard
            icon={TrendingDown}
            label="Phiếu xuất"
            value={stats.countOut}
            tone="bg-rose-100 text-rose-700"
          />
        </div>

        <div className="card-portal overflow-hidden p-0">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <BadgeInfo className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    Danh sách phiếu
                  </h3>
                  <p className="text-xs text-slate-500">
                    Card trên mobile, bảng trên desktop.
                  </p>
                </div>
              </div>

              <div className="inline-flex w-full rounded-2xl bg-slate-100 p-1 sm:w-auto">
                {['in', 'out'].map((key) => {
                  const meta = TAB_META[key];
                  const Icon = meta.icon;
                  const active = tab === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all sm:flex-none ${
                        active
                          ? 'bg-white text-primary shadow-sm ring-1 ring-gray-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className={`rounded-xl px-3 py-2 text-sm font-medium ring-1 ${currentMeta.tone}`}>
                Đang xem: {currentMeta.label}
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
                Tổng giá trị:{' '}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(stats.totalValue)} ₫
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
                Số phiếu:{' '}
                <span className="font-semibold text-slate-900">{movements.length}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Package className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Chưa có phiếu</p>
              <p className="mt-1 text-xs text-slate-500">
                Tạo phiếu {tab === 'in' ? 'nhập' : 'xuất'} mới để bắt đầu
              </p>
              <button
                type="button"
                onClick={openNew}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                {currentMeta.emptyHint}
              </button>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 md:hidden">
                {movements.map((m) => (
                  <div key={m.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900">
                            {m.code || '—'}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${currentMeta.tone}`}>
                            {currentMeta.label}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(m.movement_date)}
                        </p>
                      </div>

                      <div className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-right">
                        <p className="text-[11px] font-medium text-slate-500">Tổng tiền</p>
                        <p className="text-sm font-semibold text-primary">
                          {formatCurrency(m.total_amount)} ₫
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Người lập</span>
                        <span className="font-medium text-slate-800">
                          {m.profiles?.full_name || '—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Nhà cung cấp</span>
                        <span className="max-w-[60%] truncate font-medium text-slate-800">
                          {m.suppliers?.name || '—'}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <span className="text-slate-500">Ghi chú</span>
                        <span className="max-w-[60%] text-right font-medium text-slate-700">
                          {m.note || '—'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(m);
                          setShowForm(true);
                        }}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-amber-100 px-3.5 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        disabled={savingDeleteId === m.id}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-red-100 px-3.5 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {savingDeleteId === m.id ? 'Đang xoá...' : 'Xoá'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="table-head-row sticky top-0 z-10">
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
                    {movements.map((m) => (
                      <tr key={m.id} className="table-row">
                        <td className="table-cell font-medium text-slate-800">
                          {m.code}
                        </td>
                        <td className="table-cell text-slate-600">
                          {formatDateTime(m.movement_date)}
                        </td>
                        <td className="table-cell text-slate-600">
                          {m.profiles?.full_name || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="table-cell text-slate-600">
                          {m.suppliers?.name || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="table-cell font-semibold text-primary">
                          {formatCurrency(m.total_amount)} ₫
                        </td>
                        <td className="table-cell text-slate-500">
                          {m.note || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="table-cell text-right">
                          <div className="flex justify-end items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(m);
                                setShowForm(true);
                              }}
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-200"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(m.id)}
                              disabled={savingDeleteId === m.id}
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {savingDeleteId === m.id ? 'Xoá...' : 'Xoá'}
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

        {showForm && (
          <MovementForm
            type={tab}
            suppliers={suppliers}
            items={items}
            initialData={editing}
            onClose={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSaved={async () => {
              await load();
              setShowForm(false);
              setEditing(null);
            }}
          />
        )}

        <style>{`
          .table-head-row {
            background: linear-gradient(to right, rgb(248 250 252), rgb(255 255 255));
          }

          .table-head-cell {
            padding: 0.95rem 1rem;
            text-align: left;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: rgb(100 116 139);
            border-bottom: 1px solid rgb(226 232 240);
            white-space: nowrap;
          }

          .table-row:hover {
            background: rgb(248 250 252);
          }

          .table-cell {
            padding: 1rem 1rem;
            vertical-align: top;
          }

          @media (max-width: 767px) {
            .page-header {
              flex-direction: column;
              align-items: flex-start;
            }

            .page-header .btn-primary,
            .page-header .btn-secondary {
              width: 100%;
              justify-content: center;
            }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
};

export default StockMovements;
