// src/pages/admin/Profile.jsx

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  LogOut,
  User,
  Mail,
  ShieldCheck,
  Clock3,
  MapPin,
  RefreshCw,
  Laptop,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getOrCreateDeviceId } from '../../lib/device';
import AdminLayout from '../../components/AdminLayout';

// =========================================================
// DEVICE ICON
// =========================================================

const getDeviceIcon = (deviceType) => {
  switch (deviceType) {
    case 'mobile':
      return Smartphone;

    case 'tablet':
      return Tablet;

    case 'desktop':
      return Monitor;

    default:
      return Laptop;
  }
};


// =========================================================
// DEVICE TYPE LABEL
// =========================================================

const getDeviceTypeLabel = (deviceType) => {
  switch (deviceType) {
    case 'mobile':
      return 'Điện thoại';

    case 'tablet':
      return 'Máy tính bảng';

    case 'desktop':
      return 'Máy tính';

    default:
      return 'Thiết bị';
  }
};


// =========================================================
// ROLE LABEL
// =========================================================

const getRoleLabel = (role) => {
  switch (role) {
    case 'admin':
      return 'Admin';

    case 'developers':
      return 'Developer';

    case 'telesale':
      return 'Telesale';

    case 'assistant':
      return 'Trợ lý';

    case 'receptionist':
      return 'Lễ tân';

    case 'staff':
      return 'Nhân viên';

    default:
      return role || 'Chưa xác định';
  }
};


// =========================================================
// FORMAT DATE
// =========================================================

const formatDateTime = (value) => {
  if (!value) {
    return 'Chưa xác định';
  }

  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return 'Chưa xác định';
  }
};


// =========================================================
// RELATIVE TIME
// =========================================================

const getRelativeTime = (value) => {
  if (!value) {
    return 'Chưa hoạt động';
  }

  const date = new Date(value);
  const diff = Date.now() - date.getTime();

  if (diff < 0) {
    return 'Vừa hoạt động';
  }

  const seconds = Math.floor(diff / 1000);

  if (seconds < 30) {
    return 'Vừa hoạt động';
  }

  if (seconds < 60) {
    return `${seconds} giây trước`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} phút trước`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} giờ trước`;
  }

  const days = Math.floor(hours / 24);

  if (days < 30) {
    return `${days} ngày trước`;
  }

  return formatDateTime(value);
};


// =========================================================
// DEVICE LOCATION
// =========================================================

const getDeviceLocationLabel = (device) => {
  if (device.location_label) {
    return device.location_label;
  }

  if (
    device.location_city &&
    device.location_country
  ) {
    return `${device.location_city}, ${device.location_country}`;
  }

  if (device.location_city) {
    return device.location_city;
  }

  if (device.location_country) {
    return device.location_country;
  }

  return 'Không xác định vị trí';
};


// =========================================================
// MAIN
// =========================================================

const Profile = () => {
  const {
    user,
    profile,
  } = useAuth();

  const [devices, setDevices] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [revokingId, setRevokingId] = useState(null);

  const [error, setError] = useState(null);


  // =========================================================
  // CURRENT DEVICE
  // =========================================================

  const currentDeviceId = useMemo(
    () => getOrCreateDeviceId(),
    []
  );


  // =========================================================
  // LOAD DEVICES
  // =========================================================

  const loadDevices = useCallback(
    async (showRefresh = false) => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);


        /*
         * QUAN TRỌNG:
         *
         * Các cột này phải đúng với schema:
         *
         * os_name
         * browser_name
         * location_city
         * location_country
         * location_label
         *
         * KHÔNG dùng:
         * os
         * browser
         * location
         * latitude
         * longitude
         */

        const {
          data,
          error: queryError,
        } = await supabase
          .from('login_devices')
          .select(`
            id,
            user_id,
            device_id,
            device_type,
            device_name,
            os_name,
            browser_name,
            location_city,
            location_country,
            location_label,
            first_login_at,
            last_login_at,
            last_seen_at,
            is_active,
            revoked_at,
            created_at,
            updated_at
          `)
          .eq('user_id', user.id)
          .order('last_seen_at', {
            ascending: false,
          });


        // ----------------------------------------------------
        // Supabase error
        // ----------------------------------------------------

        if (queryError) {
          console.error(
            'Load login devices error:',
            {
              message: queryError.message,
              details: queryError.details,
              hint: queryError.hint,
              code: queryError.code,
              status: queryError.status,
              error: queryError,
            }
          );

          throw queryError;
        }


        console.log(
          'Login devices loaded:',
          data
        );


        setDevices(data || []);
      } catch (queryError) {
        console.error(
          'Load login devices error:',
          {
            message: queryError?.message,
            details: queryError?.details,
            hint: queryError?.hint,
            code: queryError?.code,
            status: queryError?.status,
            error: queryError,
          }
        );


        setDevices([]);


        setError(
          queryError?.message ||
            'Không thể tải danh sách thiết bị.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);


  // =========================================================
  // REVOKE DEVICE
  // =========================================================

  const revokeDevice = async (device) => {
    if (!device?.id) {
      return;
    }


    // Không cho đăng xuất thiết bị hiện tại
    if (
      device.device_id === currentDeviceId
    ) {
      return;
    }


    const confirmed = window.confirm(
      `Bạn có chắc muốn đăng xuất thiết bị "${
        device.device_name ||
        getDeviceTypeLabel(
          device.device_type
        )
      }"?`
    );


    if (!confirmed) {
      return;
    }


    try {
      setRevokingId(device.id);


      const {
        error: updateError,
      } = await supabase
        .from('login_devices')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
        })
        .eq('id', device.id)
        .eq('user_id', user.id);


      if (updateError) {
        console.error(
          'Revoke device error:',
          updateError
        );

        throw updateError;
      }


      await loadDevices(true);
    } catch (updateError) {
      console.error(
        'Revoke device error:',
        {
          message: updateError?.message,
          details: updateError?.details,
          hint: updateError?.hint,
          code: updateError?.code,
          error: updateError,
        }
      );


      alert(
        updateError?.message ||
          'Không thể đăng xuất thiết bị này.'
      );
    } finally {
      setRevokingId(null);
    }
  };


  // =========================================================
  // ACTIVE DEVICES
  // =========================================================

  const activeDevices = devices.filter(
    (device) =>
      device.is_active === true
  );


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <AdminLayout>
          <div className="space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Thông tin tài khoản
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Quản lý thông tin cá nhân và các thiết bị đăng nhập.
          </p>
        </div>


        <button
          type="button"
          onClick={() => loadDevices(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >

          <RefreshCw
            className={`h-4 w-4 ${
              refreshing
                ? 'animate-spin'
                : ''
            }`}
          />

          Làm mới

        </button>

      </div>


      {/* =====================================================
          ACCOUNT INFORMATION
      ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>

            <div>

              <h2 className="text-base font-semibold text-slate-800">
                Thông tin tài khoản
              </h2>

              <p className="text-xs text-slate-400">
                Thông tin đăng nhập và hồ sơ
              </p>

            </div>

          </div>

        </div>


        <div className="grid gap-0 md:grid-cols-2">

          {/* EMAIL */}

          <div className="flex items-center gap-4 border-b border-slate-100 p-5 md:border-r sm:p-6">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Mail className="h-5 w-5" />
            </div>

            <div className="min-w-0">

              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Email đăng nhập
              </p>

              <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                {user?.email ||
                  'Chưa xác định'}
              </p>

            </div>

          </div>


          {/* FULL NAME */}

          <div className="flex items-center gap-4 border-b border-slate-100 p-5 sm:p-6">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <User className="h-5 w-5" />
            </div>

            <div className="min-w-0">

              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Họ và tên
              </p>

              <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                {profile?.full_name ||
                  'Chưa cập nhật'}
              </p>

            </div>

          </div>


          {/* ROLE */}

          <div className="flex items-center gap-4 border-b border-slate-100 p-5 md:border-r sm:p-6">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>

              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Vai trò
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {getRoleLabel(
                  profile?.role
                )}
              </p>

            </div>

          </div>


          {/* ACCOUNT ID */}

          <div className="flex items-center gap-4 border-b border-slate-100 p-5 sm:p-6 md:border-b-0">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Globe className="h-5 w-5" />
            </div>

            <div className="min-w-0">

              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                ID tài khoản
              </p>

              <p className="mt-1 truncate font-mono text-xs text-slate-600">
                {user?.id || '—'}
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          DEVICES
      ===================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Laptop className="h-5 w-5" />
            </div>

            <div>

              <h2 className="text-base font-semibold text-slate-800">
                Thiết bị đăng nhập
              </h2>

              <p className="text-xs text-slate-400">
                Tài khoản có thể đăng nhập trên nhiều thiết bị.
              </p>

            </div>

          </div>


          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {activeDevices.length} thiết bị đang hoạt động
          </span>

        </div>


        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <div className="min-w-0">

              <p className="font-medium">
                Không thể tải danh sách thiết bị
              </p>

              <p className="mt-1 break-words text-xs text-red-600">
                {error}
              </p>

            </div>

          </div>
        )}


        {/* ===================================================
            LOADING
        =================================================== */}

        {loading ? (

          <div className="mt-5 space-y-3">

            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-2xl border border-slate-100 p-4"
                >

                  <div className="flex gap-4">

                    <div className="h-12 w-12 rounded-xl bg-slate-100" />

                    <div className="flex-1 space-y-2">

                      <div className="h-4 w-40 rounded bg-slate-100" />

                      <div className="h-3 w-64 rounded bg-slate-100" />

                      <div className="h-3 w-48 rounded bg-slate-100" />

                    </div>

                  </div>

                </div>
              )
            )}

          </div>

        ) : devices.length === 0 ? (

          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 py-12 text-center">

            <Laptop className="mx-auto h-10 w-10 text-slate-300" />

            <p className="mt-3 text-sm font-medium text-slate-600">
              Chưa có thông tin thiết bị
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Thiết bị hiện tại sẽ được ghi nhận sau lần đồng bộ tiếp theo.
            </p>

          </div>

        ) : (

          <div className="mt-5 space-y-3">

            {devices.map(
              (device) => {
                const DeviceIcon =
                  getDeviceIcon(
                    device.device_type
                  );

                const isCurrent =
                  device.device_id ===
                  currentDeviceId;

                const isActive =
                  device.is_active ===
                  true;


                return (
                  <div
                    key={device.id}
                    className={`
                      relative overflow-hidden rounded-2xl border p-4 transition
                      ${
                        isCurrent
                          ? 'border-primary/30 bg-primary/[0.035] shadow-sm'
                          : 'border-slate-200 bg-white'
                      }
                    `}
                  >

                    {/* Current device indicator */}

                    {isCurrent && (
                      <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
                    )}


                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                      {/* DEVICE INFORMATION */}

                      <div className="flex min-w-0 gap-4">

                        {/* ICON */}

                        <div
                          className={`
                            flex h-12 w-12 shrink-0 items-center justify-center rounded-xl
                            ${
                              isCurrent
                                ? 'bg-primary text-white'
                                : 'bg-slate-100 text-slate-600'
                            }
                          `}
                        >

                          <DeviceIcon className="h-6 w-6" />

                        </div>


                        <div className="min-w-0 flex-1">

                          {/* NAME + BADGES */}

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="text-sm font-semibold text-slate-800">

                              {device.device_name ||
                                getDeviceTypeLabel(
                                  device.device_type
                                )}

                            </h3>


                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">

                                <CheckCircle2 className="h-3 w-3" />

                                Thiết bị hiện tại

                              </span>
                            )}


                            {isActive &&
                              !isCurrent && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">

                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                                  Đang hoạt động

                                </span>
                              )}


                            {!isActive && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                Đã đăng xuất
                              </span>
                            )}

                          </div>


                          {/* DEVICE DETAILS */}

                          <div className="mt-2 grid gap-1.5 text-xs text-slate-500 sm:grid-cols-2">

                            {/* Type */}

                            <div className="flex items-center gap-2">

                              <Monitor className="h-3.5 w-3.5 shrink-0" />

                              <span>
                                {getDeviceTypeLabel(
                                  device.device_type
                                )}
                              </span>

                            </div>


                            {/* OS + Browser */}

                            <div className="flex min-w-0 items-center gap-2">

                              <Globe className="h-3.5 w-3.5 shrink-0" />

                              <span className="truncate">

                                {device.os_name ||
                                  'Không xác định'}

                                {' · '}

                                {device.browser_name ||
                                  'Không xác định'}

                              </span>

                            </div>


                            {/* LOCATION */}

                            <div className="flex items-center gap-2 sm:col-span-2">

                              <MapPin className="h-3.5 w-3.5 shrink-0" />

                              <span>
                                {getDeviceLocationLabel(
                                  device
                                )}
                              </span>

                            </div>


                            {/* LAST SEEN */}

                            <div className="flex items-center gap-2 sm:col-span-2">

                              <Clock3 className="h-3.5 w-3.5 shrink-0" />

                              <span>

                                Hoạt động gần nhất:{' '}

                                <strong className="font-medium text-slate-600">

                                  {getRelativeTime(
                                    device.last_seen_at
                                  )}

                                </strong>

                              </span>

                            </div>

                          </div>


                          {/* DATES */}

                          <div className="mt-3 space-y-1 text-[11px] text-slate-400">

                            <p>
                              Đăng nhập lần đầu:{' '}

                              {formatDateTime(
                                device.first_login_at
                              )}
                            </p>

                            <p>
                              Đăng nhập gần nhất:{' '}

                              {formatDateTime(
                                device.last_login_at
                              )}
                            </p>

                          </div>

                        </div>

                      </div>


                      {/* LOGOUT DEVICE */}

                      {!isCurrent &&
                        isActive && (

                          <button
                            type="button"
                            onClick={() =>
                              revokeDevice(
                                device
                              )
                            }
                            disabled={
                              revokingId ===
                              device.id
                            }
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >

                            {revokingId ===
                            device.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <LogOut className="h-4 w-4" />
                            )}

                            {revokingId ===
                            device.id
                              ? 'Đang xử lý...'
                              : 'Đăng xuất'}

                          </button>

                        )}

                    </div>

                  </div>
                );
              }
            )}

          </div>

        )}

      </section>

    </div>
    </AdminLayout>

  );
};


export default Profile;