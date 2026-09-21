import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';

import {
  Users,
  Plus,
  Pencil,
  Power,
  Search,
  X,
  Check,
  Palette,
} from 'lucide-react';

import {
  normalizeTelesaleColor,
  getTelesaleSwatchStyle,
} from '../../utils/telesaleColors';

const DEFAULT_COLOR = '#64748B';

const Telesales = () => {
  const [telesales, setTelesales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [editing, setEditing] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    color: DEFAULT_COLOR,
    is_active: true,
  });

  /*
  |--------------------------------------------------------------------------
  | FETCH TELESALES
  |--------------------------------------------------------------------------
  */

  const fetchTelesales = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('telesales')
      .select(
        'id, name, email, color, is_active'
      )
      .order('name', {
        ascending: true,
      });

    if (error) {
      console.error(
        'fetchTelesales error:',
        error
      );

      alert(
        error.message ||
          'Không thể tải danh sách telesale.'
      );
    }

    setTelesales(data || []);
    setLoading(false);
  };

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchTelesales();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | FILTER
  |--------------------------------------------------------------------------
  */

  const filtered = useMemo(() => {
    const q = search
      .trim()
      .toLowerCase();

    if (!q) {
      return telesales;
    }

    return telesales.filter((t) =>
      `${t.name || ''} ${t.email || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [telesales, search]);

  /*
  |--------------------------------------------------------------------------
  | CREATE
  |--------------------------------------------------------------------------
  */

  const openCreate = () => {
    setEditing(null);

    setForm({
      name: '',
      email: '',
      color: DEFAULT_COLOR,
      is_active: true,
    });

    setIsModalOpen(true);
  };

  /*
  |--------------------------------------------------------------------------
  | EDIT
  |--------------------------------------------------------------------------
  */

  const openEdit = (telesale) => {
    setEditing(telesale.id);

    setForm({
      name: telesale.name || '',
      email: telesale.email || '',
      color: normalizeTelesaleColor(
        telesale.color
      ),
      is_active:
        telesale.is_active !== false,
    });

    setIsModalOpen(true);
  };

  /*
  |--------------------------------------------------------------------------
  | CLOSE FORM
  |--------------------------------------------------------------------------
  */

  const closeForm = () => {
    setEditing(null);

    setForm({
      name: '',
      email: '',
      color: DEFAULT_COLOR,
      is_active: true,
    });

    setIsModalOpen(false);
  };

  /*
  |--------------------------------------------------------------------------
  | SUBMIT
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert('Vui lòng nhập tên telesale.');
      return;
    }

    if (!form.email.trim()) {
      alert('Vui lòng nhập email.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        color: normalizeTelesaleColor(
          form.color
        ),
        is_active: !!form.is_active,
      };

      let result;

      if (editing) {
        result = await supabase
          .from('telesales')
          .update(payload)
          .eq('id', editing);
      } else {
        result = await supabase
          .from('telesales')
          .insert([payload]);
      }

      if (result.error) {
        console.error(
          'Telesale save error:',
          result.error
        );

        alert(
          result.error.message ||
            'Không thể lưu telesale.'
        );

        return;
      }

      closeForm();

      await fetchTelesales();
    } catch (error) {
      console.error(
        'handleSubmit error:',
        error
      );

      alert(
        error.message ||
          'Có lỗi xảy ra khi lưu telesale.'
      );
    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | TOGGLE ACTIVE
  |--------------------------------------------------------------------------
  */

  const toggleActive = async (telesale) => {
    const { error } = await supabase
      .from('telesales')
      .update({
        is_active: !telesale.is_active,
      })
      .eq('id', telesale.id);

    if (error) {
      console.error(
        'toggleActive error:',
        error
      );

      alert(
        error.message ||
          'Không thể cập nhật trạng thái.'
      );

      return;
    }

    await fetchTelesales();
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* ================================================================
            HEADER
        ================================================================ */}

        <div className="page-header">
          <div className="page-header-main">

            <div className="page-header-icon bg-blue-100 text-[#025899] shadow-lg">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>

            <div>
              <h2 className="page-header-title text-slate-800">
                Quản lý Telesale
              </h2>

              <p className="page-header-subtitle">
                Danh sách, màu nhận diện và trạng thái telesale
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="btn-primary inline-flex items-center gap-2 px-4"
          >
            <Plus className="h-4 w-4" />
            Thêm telesale
          </button>
        </div>

        {/* ================================================================
            SEARCH
        ================================================================ */}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

          <div className="relative max-w-md">

            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Tìm theo tên hoặc email..."
              className="input-portal w-full pl-9"
            />

          </div>
        </div>

        {/* ================================================================
            TABLE
        ================================================================ */}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

          {loading ? (

            <div className="p-10 text-center text-sm text-slate-500">
              Đang tải...
            </div>

          ) : filtered.length === 0 ? (

            <div className="p-10 text-center text-sm text-slate-500">
              Chưa có telesale phù hợp.
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[700px] text-sm">

                <thead>

                  <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

                    <th className="px-5 py-3">
                      Màu
                    </th>

                    <th className="px-5 py-3">
                      Telesale
                    </th>

                    <th className="px-5 py-3">
                      Email
                    </th>

                    <th className="px-5 py-3">
                      Trạng thái
                    </th>

                    <th className="px-5 py-3 text-center">
                      Thao tác
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filtered.map((telesale) => {

                    const color =
                      normalizeTelesaleColor(
                        telesale.color
                      );

                    return (
                      <tr
                        key={telesale.id}
                        className="border-b last:border-0 hover:bg-slate-50/70"
                      >

                        {/* MÀU */}

                        <td className="px-5 py-4">

                          <span
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
                            style={getTelesaleSwatchStyle(
                              color
                            )}
                          >
                            <span
                              className="h-4 w-4 rounded-full"
                              style={{
                                backgroundColor:
                                  color,
                              }}
                            />
                          </span>

                        </td>

                        {/* NAME */}

                        <td className="px-5 py-4">

                          <div className="font-semibold text-slate-800">
                            {telesale.name || '—'}
                          </div>

                        </td>

                        {/* EMAIL */}

                        <td className="px-5 py-4 text-slate-600">
                          {telesale.email || '—'}
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                              telesale.is_active
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-slate-100 text-slate-500'
                            }`}
                          >
                            {telesale.is_active
                              ? 'Hoạt động'
                              : 'Tạm ngưng'}
                          </span>

                        </td>

                        {/* ACTIONS */}

                        <td className="px-5 py-4">

                          <div className="flex justify-center gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                openEdit(telesale)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Sửa
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleActive(
                                  telesale
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Power className="h-3.5 w-3.5" />

                              {telesale.is_active
                                ? 'Tạm ngưng'
                                : 'Kích hoạt'}
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* ================================================================
            MODAL
        ================================================================ */}

        {isModalOpen && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">

            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">

              {/* HEADER */}

              <div className="mb-5 flex items-start justify-between">

                <div>

                  <h3 className="text-lg font-semibold text-slate-900">
                    {editing
                      ? 'Chỉnh sửa telesale'
                      : 'Thêm telesale'}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Thông tin được dùng chung cho toàn hệ thống.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>

              </div>

              {/* FORM */}

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >

                {/* NAME */}

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Tên telesale
                  </label>

                  <input
                    required
                    className="input-portal"
                    value={form.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                      })
                    }
                  />

                </div>

                {/* EMAIL */}

                <div>

                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email Supabase
                  </label>

                  <input
                    required
                    type="email"
                    className="input-portal"
                    value={form.email}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        email: e.target.value,
                      })
                    }
                  />

                </div>

                {/* COLOR */}

                <div>

                  <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">

                    <Palette className="h-4 w-4" />

                    Màu nhận diện

                  </label>

                  <div className="flex items-center gap-3">

                    <input
                      type="color"
                      value={normalizeTelesaleColor(
                        form.color
                      )}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          color: e.target.value,
                        })
                      }
                      className="h-11 w-16 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                    />

                    <input
                      className="input-portal flex-1 uppercase"
                      value={form.color}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          color:
                            e.target.value,
                        })
                      }
                      placeholder="#64748B"
                      maxLength={7}
                    />

                  </div>

                  {/* COLOR PREVIEW */}

                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">

                    <p className="mb-2 text-xs font-medium text-slate-500">
                      Xem trước
                    </p>

                    <div
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                      style={{
                        ...getTelesaleSwatchStyle(
                          form.color
                        ),
                        color:
                          getTelesaleSwatchStyle(
                            form.color
                          ).borderColor,
                      }}
                    >

                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            normalizeTelesaleColor(
                              form.color
                            ),
                        }}
                      />

                      {form.name ||
                        'Tên telesale'}

                    </div>

                  </div>

                </div>

                {/* ACTIVE */}

                <label className="flex items-center gap-2 text-sm text-slate-700">

                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        is_active:
                          e.target.checked,
                      })
                    }
                  />

                  Đang hoạt động

                </label>

                {/* BUTTONS */}

                <div className="flex justify-end gap-3 pt-2">

                  <button
                    type="button"
                    onClick={closeForm}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Hủy
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary inline-flex items-center gap-2"
                  >

                    {saving ? (
                      'Đang lưu...'
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Lưu
                      </>
                    )}

                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default Telesales;