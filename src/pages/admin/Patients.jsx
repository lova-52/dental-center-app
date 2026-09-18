// File: src/pages/admin/Patients.jsx

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  useNavigate,
  useLocation,
} from 'react-router-dom';

import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';

import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  FileText,
  ImagePlus,
  Search,
  X,
  CalendarDays,
  Cake,
  Phone,
  StickyNote,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Filter,
  ReceiptText,
  MoreHorizontal,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BadgeInfo,
  UserRound,
  Eye,
} from 'lucide-react';


// ============================================================
// STATUS
// ============================================================

const STATUS_OPTIONS = [
  {
    value: 'all',
    label: 'Tất cả trạng thái',
  },
  {
    value: 'lead',
    label: 'Khách tiềm năng',
  },
  {
    value: 'confirmed',
    label: 'Đã xác nhận',
  },
  {
    value: 'in care',
    label: 'Đang điều trị',
  },
  {
    value: 'following',
    label: 'Đang theo dõi',
  },
  {
    value: 'done',
    label: 'Đã hoàn thành',
  },
  {
    value: 'cancelled',
    label: 'Đã hủy',
  },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];


// ============================================================
// NORMALIZE STATUS
// ============================================================

const normalizeStatus = (status) => {
  const value = String(status || 'lead')
    .trim()
    .toLowerCase();

  if (value === 'incare') return 'in care';
  if (value === 'in care') return 'in care';

  if (value === 'confirmed') return 'confirmed';

  if (value === 'following') return 'following';

  if (value === 'done') return 'done';

  if (value === 'cancelled') return 'cancelled';

  if (value === 'lead') return 'lead';

  return 'lead';
};


// ============================================================
// STATUS STYLE
// ============================================================

const getStatusStyle = (status) => {
  switch (normalizeStatus(status)) {
    case 'lead':
      return 'bg-sky-50 text-sky-700 ring-sky-200';

    case 'confirmed':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';

    case 'in care':
      return 'bg-violet-50 text-violet-700 ring-violet-200';

    case 'following':
      return 'bg-amber-50 text-amber-700 ring-amber-200';

    case 'done':
      return 'bg-green-50 text-green-700 ring-green-200';

    case 'cancelled':
      return 'bg-rose-50 text-rose-700 ring-rose-200';

    default:
      return 'bg-gray-50 text-gray-600 ring-gray-200';
  }
};


// ============================================================
// STATUS LABEL
// ============================================================

const getStatusLabel = (status) => {
  const found = STATUS_OPTIONS.find(
    (item) =>
      item.value === normalizeStatus(status)
  );

  return found?.label || '—';
};


// ============================================================
// FORMAT DATE
// ============================================================

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};


// ============================================================
// INITIALS
// ============================================================

const getInitials = (name = '') => {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '—';
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0] || ''}${
    parts[parts.length - 1][0] || ''
  }`.toUpperCase();
};


// ============================================================
// SORT LABEL
// ============================================================

const SORT_CONFIG = {
  full_name: {
    asc: 'A → Z',
    desc: 'Z → A',
  },

  appointment_date: {
    asc: 'Cũ → mới',
    desc: 'Mới → cũ',
  },

  created_at: {
    asc: 'Cũ → mới',
    desc: 'Mới → cũ',
  },

  status: {
    asc: 'A → Z',
    desc: 'Z → A',
  },
};


// ============================================================
// ACTION MENU
// ============================================================

const ActionMenu = ({
  customer,
  onEdit,
  onDelete,
  onOpenIncidents,
  onOpenInvoices,
  open,
  onToggle,
}) => {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const [menuPos, setMenuPos] = useState(null);


  // ----------------------------------------------------------
  // Calculate menu position
  // ----------------------------------------------------------

  const calculateMenuPosition = () => {
    if (
      !open ||
      !buttonRef.current ||
      !menuRef.current
    ) {
      return;
    }

    const buttonRect =
      buttonRef.current.getBoundingClientRect();

    const menuRect =
      menuRef.current.getBoundingClientRect();

    const gap = 8;
    const viewportPadding = 12;

    const menuWidth = menuRect.width;
    const menuHeight = menuRect.height;


    // Horizontal position
    let left =
      buttonRect.right - menuWidth;

    if (left < viewportPadding) {
      left = viewportPadding;
    }

    const maxLeft =
      window.innerWidth -
      menuWidth -
      viewportPadding;

    if (left > maxLeft) {
      left = maxLeft;
    }


    // Available space
    const spaceBelow =
      window.innerHeight -
      buttonRect.bottom -
      viewportPadding;

    const spaceAbove =
      buttonRect.top -
      viewportPadding;


    let top;


    // Open downward
    if (
      spaceBelow >=
      menuHeight + gap
    ) {
      top =
        buttonRect.bottom +
        gap;
    }

    // Open upward
    else if (
      spaceAbove >=
      menuHeight + gap
    ) {
      top =
        buttonRect.top -
        menuHeight -
        gap;
    }

    // Neither side has enough room:
    // choose the side with more available space
    else if (
      spaceBelow >= spaceAbove
    ) {
      top =
        buttonRect.bottom +
        gap;

      top = Math.min(
        top,
        window.innerHeight -
          menuHeight -
          viewportPadding
      );

      top = Math.max(
        viewportPadding,
        top
      );
    }

    else {
      top =
        buttonRect.top -
        menuHeight -
        gap;

      top = Math.max(
        viewportPadding,
        top
      );

      top = Math.min(
        top,
        window.innerHeight -
          menuHeight -
          viewportPadding
      );
    }


    setMenuPos({
      top,
      left,
    });
  };


  // ----------------------------------------------------------
  // Initial positioning
  // ----------------------------------------------------------

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }

    const frame =
      requestAnimationFrame(() => {
        calculateMenuPosition();
      });

    return () =>
      cancelAnimationFrame(frame);

  }, [
    open,
    customer?.id,
  ]);


  // ----------------------------------------------------------
  // Reposition on scroll / resize
  // ----------------------------------------------------------

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleViewportChange = () => {
      calculateMenuPosition();
    };

    window.addEventListener(
      'resize',
      handleViewportChange
    );

    window.addEventListener(
      'scroll',
      handleViewportChange,
      true
    );

    return () => {
      window.removeEventListener(
        'resize',
        handleViewportChange
      );

      window.removeEventListener(
        'scroll',
        handleViewportChange,
        true
      );
    };

  }, [open]);


  return (
    <div className="relative">

      {/* Menu button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="
          inline-flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          border
          border-gray-200
          bg-white
          text-gray-500
          shadow-sm
          transition
          hover:bg-gray-50
          hover:text-gray-800
        "
        aria-label="Mở menu thao tác"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>


      {/* Action menu */}
      {open ? (
        <div
          ref={menuRef}
          onClick={(e) =>
            e.stopPropagation()
          }
          className="
            fixed
            z-[100]
            w-[250px]
            overflow-hidden
            rounded-2xl
            border
            border-gray-200
            bg-white
            shadow-2xl
          "
          style={{
            top:
              menuPos?.top !== undefined
                ? `${menuPos.top}px`
                : '-9999px',

            left:
              menuPos?.left !== undefined
                ? `${menuPos.left}px`
                : '-9999px',
          }}
        >

          {/* Menu header */}
          <div
            className="
              border-b
              border-gray-100
              bg-gray-50/70
              px-4
              py-3
            "
          >
            <p className="
              truncate
              text-sm
              font-semibold
              text-gray-900
            ">
              {customer.full_name || '—'}
            </p>

            <p className="
              mt-0.5
              text-xs
              text-gray-500
            ">
              Chọn thao tác nhanh
            </p>
          </div>


          {/* Edit */}
          <button
            type="button"
            className="
              flex
              w-full
              items-center
              gap-3
              px-4
              py-3
              text-sm
              text-gray-700
              transition
              hover:bg-gray-50
            "
            onClick={() =>
              onEdit(customer)
            }
          >
            <Pencil
              className="
                h-4
                w-4
                text-amber-600
              "
            />

            Chỉnh sửa
          </button>


          {/* Treatment record */}
          <button
            type="button"
            className="
              flex
              w-full
              items-center
              gap-3
              px-4
              py-3
              text-sm
              text-gray-700
              transition
              hover:bg-gray-50
            "
            onClick={() =>
              onOpenIncidents(customer)
            }
          >
            <ClipboardList
              className="
                h-4
                w-4
                text-primary
              "
            />

            Phiếu điều trị
          </button>


          {/* Invoice */}
          <button
            type="button"
            className="
              flex
              w-full
              items-center
              gap-3
              px-4
              py-3
              text-sm
              text-gray-700
              transition
              hover:bg-gray-50
            "
            onClick={() =>
              onOpenInvoices(customer)
            }
          >
            <ReceiptText
              className="
                h-4
                w-4
                text-emerald-600
              "
            />

            Hóa đơn
          </button>


          <div
            className="
              my-1
              border-t
              border-gray-100
            "
          />


          {/* Delete */}
          <button
            type="button"
            className="
              flex
              w-full
              items-center
              gap-3
              px-4
              py-3
              text-sm
              text-rose-600
              transition
              hover:bg-rose-50
            "
            onClick={() =>
              onDelete(customer)
            }
          >
            <Trash2 className="h-4 w-4" />

            Xóa bệnh nhân
          </button>

        </div>
      ) : null}

    </div>
  );
};


// ============================================================
// MAIN COMPONENT
// ============================================================

const Customers = () => {
  const navigate = useNavigate();
  const location = useLocation();


  // ==========================================================
  // STATE
  // ==========================================================

  const [customers, setCustomers] =
    useState([]);

  const [telesales, setTelesales] = useState([]);

  const [formData, setFormData] =
    useState({
      name: '',
      dob: '',
      contact: '',
      healthInfo: '',
      appointment_date: '',
      status: 'lead',
      telesale_ids: [],
    });

  const [editingId, setEditingId] =
    useState(null);

  const [file, setFile] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [statusUpdatingId, setStatusUpdatingId] =
    useState(null);

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState('');

  const [sortConfig, setSortConfig] =
    useState({
      key: 'created_at',
      direction: 'desc',
    });

  const [openActionId, setOpenActionId] =
    useState(null);

  const [currentPage, setCurrentPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(10);


  // ==========================================================
  // URL STATUS FILTER
  // ==========================================================

  const statusFromQuery =
    new URLSearchParams(
      location.search
    ).get('status');

  const statusFilter =
    statusFromQuery &&
    statusFromQuery !== 'all'
      ? normalizeStatus(
          statusFromQuery
        )
      : '';

  const activeStatusFilter =
    statusFilter || 'all';


  // ==========================================================
  // GENERATE ID
  // ==========================================================

  const generateId = () => {
    if (
      typeof crypto !== 'undefined' &&
      crypto.randomUUID
    ) {
      return crypto.randomUUID();
    }

    return `c${Date.now()}`;
  };


  // ==========================================================
  // FETCH CUSTOMERS
  // ==========================================================

  useEffect(() => {
    fetchCustomers();
    fetchTelesales();
  }, []);


  // ==========================================================
  // CLEANUP PREVIEW URL
  // ==========================================================

  useEffect(() => {
    return () => {
      if (
        previewUrl?.startsWith('blob:')
      ) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [previewUrl]);


  // ==========================================================
  // CLOSE ACTION MENU WHEN CLICK OUTSIDE
  // ==========================================================

  useEffect(() => {
    const close = () =>
      setOpenActionId(null);

    document.addEventListener(
      'click',
      close
    );

    return () =>
      document.removeEventListener(
        'click',
        close
      );
  }, []);


  // ==========================================================
  // RESET PAGINATION
  // ==========================================================

  useEffect(() => {
    setCurrentPage(1);
    setOpenActionId(null);

  }, [
    searchTerm,
    statusFilter,
    sortConfig.key,
    sortConfig.direction,
    pageSize,
  ]);


  // ==========================================================
  // FETCH
  // ==========================================================

  const fetchCustomers = async () => {
    const {
      data,
      error,
    } = await supabase
      .from('customers')
      .select('*')
      .order(
        'created_at',
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(error);
      return;
    }


    const customerTelesales = await fetchCustomerTelesales();

    const mapped =
      await Promise.all(
        (data || []).map(
          async (c) => {
            const normalized = {
              ...c,
              status: normalizeStatus(c.status),
              telesales: customerTelesales[c.id] || [],
              telesale_ids: (customerTelesales[c.id] || []).map((t) => t.id),
            };


            if (c.link_pfp) {
              const {
                data: urlData,
              } = supabase.storage
                .from('customers')
                .getPublicUrl(
                  c.link_pfp
                );

              normalized.pfp_url =
                urlData?.publicUrl ||
                c.link_pfp;
            } else {
              normalized.pfp_url =
                null;
            }


            return normalized;
          }
        )
      );


    setCustomers(mapped);
  };


  // ==========================================================
  // FETCH TELESALES
  // ==========================================================
  const fetchTelesales = async () => {
    const { data, error } = await supabase.from('telesales').select('id, name, email, is_active').eq('is_active', true).order('name', { ascending: true });
    if (error) { console.error('fetchTelesales error:', error); return; }
    setTelesales(data || []);
  };

  const fetchCustomerTelesales = async () => {
    const { data, error } = await supabase.from('customer_telesales').select('customer_id, telesale_id, telesales(id, name, email, color)');
    if (error) { console.error('fetchCustomerTelesales error:', error); return {}; }
    return (data || []).reduce((acc, row) => {
      if (!acc[row.customer_id]) acc[row.customer_id] = [];
      if (row.telesales) acc[row.customer_id].push(row.telesales);
      return acc;
    }, {});
  };

  // ==========================================================
  // RESET FORM
  // ==========================================================

  const resetForm = () => {
    setFormData({
      name: '',
      dob: '',
      contact: '',
      healthInfo: '',
      appointment_date: '',
      status: 'lead',
      telesale_ids: [],
    });

    setEditingId(null);
    setFile(null);
    setPreviewUrl(null);
  };


  // ==========================================================
  // FILE CHANGE
  // ==========================================================

  const handleFileChange = (e) => {
    const selectedFile =
      e.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);


    if (
      previewUrl?.startsWith('blob:')
    ) {
      URL.revokeObjectURL(
        previewUrl
      );
    }


    setPreviewUrl(
      URL.createObjectURL(
        selectedFile
      )
    );
  };


  // ==========================================================
  // UPLOAD IMAGE
  // ==========================================================

  const uploadFileToSupabase = async (
    fileToUpload,
    customerId
  ) => {
    if (!fileToUpload) {
      return null;
    }


    const ext =
      fileToUpload.name
        .split('.')
        .pop();

    const filename =
      `${customerId || generateId()}_${Date.now()}.${ext}`;

    const filePath =
      `customers/${filename}`;


    const {
      error: uploadError,
    } = await supabase.storage
      .from('customers')
      .upload(
        filePath,
        fileToUpload,
        {
          upsert: true,
        }
      );


    if (uploadError) {
      throw uploadError;
    }


    const {
      data: urlData,
    } = supabase.storage
      .from('customers')
      .getPublicUrl(
        filePath
      );


    return {
      path: filePath,
      publicUrl:
        urlData?.publicUrl ||
        null,
    };
  };


  // ==========================================================
  // SUBMIT FORM
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);


    try {
      let savedCustomerId = editingId;

      const birthYear =
        formData.dob
          ? new Date(
              formData.dob
            ).getFullYear()
          : null;


      const normalizedStatus =
        normalizeStatus(
          formData.status
        );


      // ------------------------------------------------------
      // UPDATE
      // ------------------------------------------------------

      if (editingId) {
        const updates = {
          full_name:
            formData.name,

          birth_year:
            birthYear,

          phone:
            formData.contact,

          note:
            formData.healthInfo,

          appointment_date:
            formData.appointment_date ||
            null,

          status:
            normalizedStatus,
        };


        if (file) {
          const res =
            await uploadFileToSupabase(
              file,
              editingId
            );

          updates.link_pfp =
            res.path;
        }


        const {
          error,
        } = await supabase
          .from('customers')
          .update(updates)
          .eq(
            'id',
            editingId
          );


        if (error) {
          throw error;
        }
      }


      // ------------------------------------------------------
      // INSERT
      // ------------------------------------------------------

      else {
        const newId =
          generateId();

        savedCustomerId = newId;

        let link_pfp_path =
          null;


        if (file) {
          const res =
            await uploadFileToSupabase(
              file,
              newId
            );

          link_pfp_path =
            res.path;
        }


        const {
          error,
        } = await supabase
          .from('customers')
          .insert([
            {
              id: newId,

              full_name:
                formData.name,

              birth_year:
                birthYear,

              phone:
                formData.contact,

              note:
                formData.healthInfo,

              appointment_date:
                formData.appointment_date ||
                null,

              status:
                normalizedStatus,

              link_pfp:
                link_pfp_path,
            },
          ]);


        if (error) {
          throw error;
        }
      }


      const selectedIds = (formData.telesale_ids || []).filter(Boolean).slice(0, 2);
      const customerId = savedCustomerId;
      const { error: deleteTelesaleError } = await supabase.from('customer_telesales').delete().eq('customer_id', customerId);
      if (deleteTelesaleError) throw deleteTelesaleError;
      if (selectedIds.length) {
        const { error: assignError } = await supabase.from('customer_telesales').insert(selectedIds.map((telesale_id) => ({ customer_id: customerId, telesale_id })));
        if (assignError) throw assignError;
      }

      await fetchCustomers();

      resetForm();

      setIsModalOpen(false);

    } catch (err) {
      console.error(err);

      alert(
        'Có lỗi xảy ra.'
      );

    } finally {
      setLoading(false);
    }
  };


  // ==========================================================
  // EDIT
  // ==========================================================

  const handleEdit = (
    customer
  ) => {
    setEditingId(
      customer.id
    );


    setFormData({
      name:
        customer.full_name ||
        '',

      dob:
        customer.birth_year
          ? `${customer.birth_year}-01-01`
          : '',

      contact:
        customer.phone ||
        '',

      healthInfo:
        customer.note ||
        '',

      appointment_date:
        customer.appointment_date ||
        '',

      status: normalizeStatus(customer.status),
      telesale_ids: (customer.telesales || []).map((t) => t.id).slice(0, 2),
    });


    setPreviewUrl(
      customer.pfp_url ||
      null
    );

    setFile(null);

    setIsModalOpen(true);

    setOpenActionId(null);
  };


  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete = async (
    customer
  ) => {
    if (
      !window.confirm(
        'Bạn có chắc muốn xóa bệnh nhân này?'
      )
    ) {
      return;
    }


    setLoading(true);


    try {
      if (customer.link_pfp) {
        await supabase.storage
          .from('customers')
          .remove([
            customer.link_pfp,
          ])
          .catch(() => {});
      }


      const {
        error,
      } = await supabase
        .from('customers')
        .delete()
        .eq(
          'id',
          customer.id
        );


      if (error) {
        throw error;
      }


      await fetchCustomers();

      setOpenActionId(null);

    } catch (err) {
      console.error(err);

      alert(
        'Xóa thất bại.'
      );

    } finally {
      setLoading(false);
    }
  };


  // ==========================================================
  // STATUS CHANGE
  // ==========================================================

  const handleStatusChange = async (
    customerId,
    newStatus
  ) => {
    const normalizedStatus =
      normalizeStatus(
        newStatus
      );


    setStatusUpdatingId(
      customerId
    );


    const previousCustomers =
      customers;


    // Optimistic update
    setCustomers(
      (prev) =>
        prev.map(
          (customer) =>
            customer.id ===
            customerId
              ? {
                  ...customer,
                  status:
                    normalizedStatus,
                }
              : customer
        )
    );


    try {
      const {
        error,
      } = await supabase
        .from('customers')
        .update({
          status:
            normalizedStatus,
        })
        .eq(
          'id',
          customerId
        );


      if (error) {
        throw error;
      }

    } catch (err) {
      console.error(err);

      alert(
        'Cập nhật trạng thái thất bại.'
      );

      setCustomers(
        previousCustomers
      );

    } finally {
      setStatusUpdatingId(
        null
      );
    }
  };


  // ==========================================================
  // SORT
  // ==========================================================

  const toggleSort = (
    key
  ) => {
    setSortConfig(
      (prev) => {
        if (
          prev.key === key
        ) {
          return {
            key,
            direction:
              prev.direction ===
              'asc'
                ? 'desc'
                : 'asc',
          };
        }


        return {
          key,
          direction: 'asc',
        };
      }
    );
  };


  // ==========================================================
  // SORT ICON
  // ==========================================================

  const getSortIcon = (
    key
  ) => {
    if (
      sortConfig.key !==
      key
    ) {
      return (
        <ArrowUpDown
          className="
            h-3.5
            w-3.5
            text-gray-400
          "
        />
      );
    }


    return sortConfig.direction ===
      'asc' ? (
      <ChevronUp
        className="
          h-3.5
          w-3.5
          text-primary
        "
      />
    ) : (
      <ChevronDown
        className="
          h-3.5
          w-3.5
          text-primary
        "
      />
    );
  };


  // ==========================================================
  // FILTER + SORT
  // ==========================================================

  const filteredCustomers =
    useMemo(() => {
      const q =
        searchTerm
          .trim()
          .toLowerCase();


      const filtered =
        customers.filter(
          (customer) => {
            const matchesStatus =
              !statusFilter ||
              normalizeStatus(
                customer.status
              ) ===
                statusFilter;


            if (!q) {
              return matchesStatus;
            }


            const haystack = [
              customer.full_name,
              customer.phone,
              customer.note,
              customer.appointment_date,

              customer.birth_year
                ? String(
                    customer.birth_year
                  )
                : '',

              getStatusLabel(
                customer.status
              ),

              customer.status,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();


            return (
              haystack.includes(q) &&
              matchesStatus
            );
          }
        );


      const sorted =
        [...filtered].sort(
          (a, b) => {
            const direction =
              sortConfig.direction ===
              'asc'
                ? 1
                : -1;


            switch (
              sortConfig.key
            ) {
              case 'full_name': {
                const av =
                  (
                    a.full_name ||
                    ''
                  ).toLowerCase();

                const bv =
                  (
                    b.full_name ||
                    ''
                  ).toLowerCase();


                return (
                  av.localeCompare(
                    bv,
                    'vi',
                    {
                      sensitivity:
                        'base',
                    }
                  ) *
                  direction
                );
              }


              case 'appointment_date': {
                const av =
                  a.appointment_date
                    ? new Date(
                        a.appointment_date
                      ).getTime()
                    : 0;

                const bv =
                  b.appointment_date
                    ? new Date(
                        b.appointment_date
                      ).getTime()
                    : 0;


                return (
                  (av - bv) *
                  direction
                );
              }


              case 'status':
                return (
                  getStatusLabel(
                    a.status
                  ).localeCompare(
                    getStatusLabel(
                      b.status
                    ),
                    'vi',
                    {
                      sensitivity:
                        'base',
                    }
                  ) *
                  direction
                );


              case 'created_at':

              default: {
                const av =
                  new Date(
                    a.created_at
                  ).getTime();

                const bv =
                  new Date(
                    b.created_at
                  ).getTime();


                return (
                  (av - bv) *
                  direction
                );
              }
            }
          }
        );


      return sorted;

    }, [
      customers,
      searchTerm,
      statusFilter,
      sortConfig,
    ]);


  // ==========================================================
  // PAGINATION
  // ==========================================================

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredCustomers.length /
          pageSize
      )
    );


  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );


  const paginatedCustomers =
    filteredCustomers.slice(
      (safeCurrentPage - 1) *
        pageSize,

      safeCurrentPage *
        pageSize
    );


  // ==========================================================
  // FILTER STATUS
  // ==========================================================

  const handleFilterStatus = (
    value
  ) => {
    if (
      value === 'all'
    ) {
      navigate(
        '/patients'
      );

      return;
    }


    navigate(
      `/patients?status=${value}`
    );
  };


  // ==========================================================
  // STAT CARD CLICK
  // ==========================================================

  const handleStatCardClick = (
    value
  ) => {
    handleFilterStatus(
      value
    );

    setCurrentPage(1);

    setOpenActionId(null);
  };


  // ==========================================================
  // STATISTICS
  // ==========================================================

  const stats =
    useMemo(() => {
      const counts = {
        total: customers.length,

        lead: 0,

        confirmed: 0,

        inCare: 0,

        following: 0,

        done: 0,
      };


      customers.forEach(
        (customer) => {
          const status =
            normalizeStatus(
              customer.status
            );


          if (
            status ===
            'lead'
          ) {
            counts.lead += 1;
          }


          if (
            status ===
            'confirmed'
          ) {
            counts.confirmed += 1;
          }


          if (
            status ===
            'in care'
          ) {
            counts.inCare += 1;
          }


          if (
            status ===
            'following'
          ) {
            counts.following += 1;
          }


          if (
            status ===
            'done'
          ) {
            counts.done += 1;
          }
        }
      );


      return counts;

    }, [customers]);


  // ==========================================================
  // STAT CARD
  // ==========================================================

  const StatCard = ({
    icon: Icon,
    label,
    value,
    tone,
    active,
    onClick,
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`
        group
        rounded-2xl
        border
        bg-white
        p-4
        text-left
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-[1px]
        hover:shadow-md
        focus:outline-none
        focus:ring-2
        focus:ring-primary/30

        ${
          active
            ? `
              border-primary/40
              bg-primary/5
              ring-2
              ring-primary/20
            `
            : `
              border-gray-200
            `
        }
      `}
    >
      <div className="
        flex
        items-center
        justify-between
        gap-3
      ">

        <div className="min-w-0">

          <p
            className={`
              text-xs
              font-medium
              uppercase
              tracking-wide

              ${
                active
                  ? 'text-primary'
                  : 'text-gray-500'
              }
            `}
          >
            {label}
          </p>


          <p className="
            mt-2
            text-2xl
            font-semibold
            text-gray-900
          ">
            {value}
          </p>

        </div>


        <div
          className={`
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-2xl
            transition

            ${tone}

            ${
              active
                ? 'scale-105 shadow-sm'
                : ''
            }
          `}
        >
          <Icon
            className="
              h-5
              w-5
            "
          />
        </div>

      </div>
    </button>
  );


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <AdminLayout>

      <div className="
        space-y-6
        sm:space-y-8
      ">


        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="
          page-header
          sm:mb-2
        ">

          <div className="
            page-header-main
          ">

            <div className="
              page-header-icon
            ">
              <Users
                className="
                  h-5
                  w-5
                  sm:h-6
                  sm:w-6
                "
              />
            </div>


            <div className="
              min-w-0
            ">

              <h2 className="
                page-header-title
              ">
                Quản lý bệnh nhân
              </h2>


              <p className="
                page-header-subtitle
              ">
                Giao diện hiện đại, lọc nhanh,
                thao tác gọn và dễ dùng hơn.
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={() => {
              resetForm();

              setIsModalOpen(
                true
              );
            }}
            className="
              btn-primary
              inline-flex
              items-center
              gap-2
              px-4
            "
          >
            <UserPlus
              className="
                h-4
                w-4
              "
            />

            Thêm bệnh nhân
          </button>

        </div>


        {/* ==================================================
            STATS
        ================================================== */}

        <div className="
          grid
          gap-4
          md:grid-cols-2
          xl:grid-cols-5
        ">

          <StatCard
            icon={Users}
            label="Tổng bệnh nhân"
            value={stats.total}
            tone="
              bg-slate-100
              text-slate-700
            "
            active={
              activeStatusFilter ===
              'all'
            }
            onClick={() =>
              handleStatCardClick(
                'all'
              )
            }
          />


          <StatCard
            icon={BadgeInfo}
            label="Khách tiềm năng"
            value={stats.lead}
            tone="
              bg-sky-100
              text-sky-700
            "
            active={
              activeStatusFilter ===
              'lead'
            }
            onClick={() =>
              handleStatCardClick(
                'lead'
              )
            }
          />


          <StatCard
            icon={UserRound}
            label="Đang điều trị"
            value={stats.inCare}
            tone="
              bg-violet-100
              text-violet-700
            "
            active={
              activeStatusFilter ===
              'in care'
            }
            onClick={() =>
              handleStatCardClick(
                'in care'
              )
            }
          />


          <StatCard
            icon={Eye}
            label="Đang theo dõi"
            value={stats.following}
            tone="
              bg-amber-100
              text-amber-700
            "
            active={
              activeStatusFilter ===
              'following'
            }
            onClick={() =>
              handleStatCardClick(
                'following'
              )
            }
          />


          <StatCard
            icon={Sparkles}
            label="Đã hoàn thành"
            value={stats.done}
            tone="
              bg-emerald-100
              text-emerald-700
            "
            active={
              activeStatusFilter ===
              'done'
            }
            onClick={() =>
              handleStatCardClick(
                'done'
              )
            }
          />

        </div>


        {/* ==================================================
            TABLE CARD
        ================================================== */}

        <div className="
          card-portal
          overflow-hidden
          p-0
        ">


          {/* =================================================
              FILTER BAR
          ================================================= */}

          <div className="
            border-b
            border-gray-100
            bg-gradient-to-r
            from-gray-50
            to-white
            px-4
            py-4
            sm:px-6
          ">

            <div className="
              flex
              flex-col
              gap-3
              xl:flex-row
              xl:items-center
              xl:justify-between
            ">


              {/* Title */}
              <div className="
                flex
                items-center
                gap-2
              ">

                <FileText
                  className="
                    h-5
                    w-5
                    text-primary
                  "
                />

                <div>

                  <h3 className="
                    text-base
                    font-semibold
                    text-gray-800
                  ">
                    Danh sách bệnh nhân
                  </h3>


                  <p className="
                    text-xs
                    text-gray-500
                  ">
                    Tìm kiếm, sắp xếp và thao tác
                    theo từng dòng.
                  </p>

                </div>

              </div>


              {/* Filters */}
              <div className="
                flex
                flex-col
                gap-3
                lg:flex-row
                lg:items-center
              ">


                {/* Search */}
                <div className="
                  relative
                  w-full
                  lg:w-[340px]
                ">

                  <Search
                    className="
                      pointer-events-none
                      absolute
                      left-3
                      top-1/2
                      h-4
                      w-4
                      -translate-y-1/2
                      text-gray-400
                    "
                  />


                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) =>
                      setSearchTerm(
                        e.target.value
                      )
                    }
                    placeholder="
                      Tìm tên, SĐT, ghi chú...
                    "
                    className="
                      input-portal
                      w-full
                      pl-9
                      pr-9
                    "
                  />


                  {searchTerm ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSearchTerm(
                          ''
                        )
                      }
                      className="
                        absolute
                        right-2
                        top-1/2
                        -translate-y-1/2
                        rounded-full
                        p-1
                        text-gray-400
                        hover:bg-gray-100
                        hover:text-gray-600
                      "
                    >
                      <X
                        className="
                          h-4
                          w-4
                        "
                      />
                    </button>
                  ) : null}

                </div>


                {/* Status filter */}
                <div className="
                  relative
                  w-full
                  lg:w-[240px]
                ">

                  <Filter
                    className="
                      pointer-events-none
                      absolute
                      left-3
                      top-1/2
                      h-4
                      w-4
                      -translate-y-1/2
                      text-gray-400
                    "
                  />


                  <select
                    value={
                      statusFilter ||
                      'all'
                    }
                    onChange={(e) =>
                      handleFilterStatus(
                        e.target.value
                      )
                    }
                    className="
                      input-portal
                      w-full
                      appearance-none
                      pl-9
                    "
                  >

                    {STATUS_OPTIONS.map(
                      (option) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {option.label}
                        </option>
                      )
                    )}

                  </select>

                </div>


                {/* Page size */}
                <div className="
                  relative
                  w-full
                  lg:w-[180px]
                ">

                  <select
                    value={pageSize}
                    onChange={(e) =>
                      setPageSize(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="
                      input-portal
                      w-full
                      appearance-none
                    "
                  >

                    {PAGE_SIZE_OPTIONS.map(
                      (size) => (
                        <option
                          key={size}
                          value={size}
                        >
                          {size} dòng / trang
                        </option>
                      )
                    )}

                  </select>

                </div>

              </div>

            </div>


            {/* Filter summary */}
            <div className="
              mt-3
              flex
              flex-wrap
              items-center
              gap-2
              text-xs
              text-gray-500
            ">

              <span className="
                rounded-full
                bg-gray-100
                px-3
                py-1
                font-medium
                text-gray-600
              ">
                Đang hiển thị{' '}
                {filteredCustomers.length}/
                {customers.length}
              </span>


              <span className="
                rounded-full
                bg-sky-50
                px-3
                py-1
                font-medium
                text-sky-700
              ">
                Sắp xếp:{' '}
                {
                  SORT_CONFIG[
                    sortConfig.key
                  ]?.[
                    sortConfig.direction
                  ] || '—'
                }
              </span>


              {activeStatusFilter !==
              'all' ? (
                <span className={`
                  rounded-full
                  px-3
                  py-1
                  font-medium
                  ring-1

                  ${getStatusStyle(
                    activeStatusFilter
                  )}
                `}>
                  Lọc:{' '}
                  {getStatusLabel(
                    activeStatusFilter
                  )}
                </span>
              ) : null}

            </div>

          </div>


          {/* =================================================
              EMPTY
          ================================================== */}

          {filteredCustomers.length ===
          0 ? (

            <div className="
              p-10
              text-center
              text-gray-500
            ">
              Không có bệnh nhân phù hợp
            </div>

          ) : (

            <>


              {/* =================================================
                  MOBILE
              ================================================== */}

              <div className="
                divide-y
                divide-gray-100
                p-4
                md:hidden
              ">

                {paginatedCustomers.map(
                  (customer) => (

                    <div
                      key={
                        customer.id
                      }
                      className="
                        py-4
                        first:pt-0
                      "
                    >

                      <div className="
                        flex
                        gap-3
                      ">


                        {/* Avatar */}
                        <div className="
                          shrink-0
                        ">

                          {customer.pfp_url ? (

                            <img
                              src={
                                customer.pfp_url
                              }
                              alt=""
                              className="
                                h-14
                                w-14
                                rounded-2xl
                                object-cover
                                ring-2
                                ring-gray-100
                              "
                            />

                          ) : (

                            <div className="
                              flex
                              h-14
                              w-14
                              items-center
                              justify-center
                              rounded-2xl
                              bg-gray-200
                              text-sm
                              font-semibold
                              text-gray-500
                            ">
                              {getInitials(
                                customer.full_name
                              )}
                            </div>

                          )}

                        </div>


                        {/* Content */}
                        <div className="
                          min-w-0
                          flex-1
                        ">


                          <div className="
                            flex
                            items-start
                            justify-between
                            gap-2
                          ">

                            <div className="
                              min-w-0
                            ">

                              <p className="
                                truncate
                                text-sm
                                font-semibold
                                text-gray-800
                              ">
                                {
                                  customer.full_name
                                }
                              </p>


                              <div className="
                                mt-1
                                flex
                                items-center
                                gap-1
                                text-sm
                                text-gray-600
                              ">

                                <Phone
                                  className="
                                    h-3.5
                                    w-3.5
                                    text-gray-400
                                  "
                                />

                                <span>
                                  {
                                    customer.phone ||
                                    '—'
                                  }
                                </span>

                              </div>

                              {/* Telesales — luôn nằm dưới thông tin khách hàng trên mobile */}
                              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Telesale:</span>
                                {customer.telesales?.length ? (
                                  customer.telesales.map((t) => (
                                    <span
                                      key={t.id}
                                      className="inline-flex max-w-full min-w-0 items-center rounded-full bg-[#025899]/10 px-2 py-0.5 text-[11px] font-semibold text-[#025899]"
                                    >
                                      <span className="truncate">{t.name}</span>
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-gray-400">Chưa phân công</span>
                                )}
                              </div>

                            </div>

                            {/* Status */}
                            <select
                              value={normalizeStatus(
                                customer.status
                              )}
                              onChange={(e) =>
                                handleStatusChange(
                                  customer.id,
                                  e.target.value
                                )
                              }
                              disabled={
                                statusUpdatingId ===
                                customer.id
                              }
                              className={`
                                inline-flex
                                shrink-0
                                rounded-full
                                border-0
                                px-2.5
                                py-1
                                text-[11px]
                                font-semibold
                                ring-1
                                outline-none
                                transition-colors

                                ${getStatusStyle(
                                  customer.status
                                )}
                              `}
                            >

                              {STATUS_OPTIONS
                                .filter(
                                  (s) =>
                                    s.value !==
                                    'all'
                                )
                                .map(
                                  (option) => (
                                    <option
                                      key={
                                        option.value
                                      }
                                      value={
                                        option.value
                                      }
                                    >
                                      {
                                        option.label
                                      }
                                    </option>
                                  )
                                )}

                            </select>

                          </div>


                          {/* Details */}
                          <div className="
                            mt-3
                            grid
                            gap-2
                            rounded-2xl
                            bg-gray-50
                            p-3
                          ">

                            <div className="
                              flex
                              items-center
                              gap-2
                              text-xs
                              text-gray-700
                            ">

                              <Cake
                                className="
                                  h-3.5
                                  w-3.5
                                  text-primary
                                "
                              />

                              <span className="
                                font-medium
                              ">
                                Năm sinh:
                              </span>

                              <span>
                                {
                                  customer.birth_year ||
                                  '—'
                                }
                              </span>

                            </div>


                            <div className="
                              flex
                              items-center
                              gap-2
                              text-xs
                              text-gray-700
                            ">

                              <CalendarDays
                                className="
                                  h-3.5
                                  w-3.5
                                  text-primary
                                "
                              />

                              <span className="
                                font-medium
                              ">
                                Ngày tư vấn:
                              </span>

                              <span>
                                {formatDate(
                                  customer.appointment_date
                                )}
                              </span>

                            </div>


                            <div className="
                              flex
                              items-start
                              gap-2
                              text-xs
                              text-gray-700
                            ">

                              <StickyNote
                                className="
                                  mt-0.5
                                  h-3.5
                                  w-3.5
                                  shrink-0
                                  text-primary
                                "
                              />

                              <div className="
                                min-w-0
                              ">

                                <span className="
                                  font-medium
                                ">
                                  Ghi chú:
                                </span>

                                <p className="
                                  mt-0.5
                                  whitespace-pre-wrap
                                  break-words
                                  leading-5
                                  text-gray-600
                                ">
                                  {
                                    customer.note ||
                                    '—'
                                  }
                                </p>

                              </div>

                            </div>

                          </div>


                          {/* Actions */}
                          <div className="
                            mt-3
                            flex
                            flex-wrap
                            items-center
                            gap-2
                          ">

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/patient/${customer.id}/incidents`
                                )
                              }
                              className="
                                inline-flex
                                min-h-[38px]
                                shrink-0
                                items-center
                                gap-2
                                whitespace-nowrap
                                rounded-xl
                                bg-primary
                                px-3.5
                                py-2
                                text-sm
                                font-medium
                                text-white
                                shadow-sm
                                transition
                                hover:shadow-md
                              "
                            >

                              <ClipboardList
                                className="
                                  h-4
                                  w-4
                                  shrink-0
                                "
                              />

                              <span className="
                                whitespace-nowrap
                              ">
                                Hồ sơ
                              </span>

                            </button>


                            <ActionMenu
                              customer={
                                customer
                              }

                              onEdit={
                                handleEdit
                              }

                              onDelete={
                                handleDelete
                              }

                              onOpenIncidents={(
                                c
                              ) =>
                                navigate(
                                  `/patient/${c.id}/incidents`
                                )
                              }

                              onOpenInvoices={(
                                c
                              ) =>
                                navigate(
                                  `/patient/${c.id}/invoices`
                                )
                              }

                              open={
                                openActionId ===
                                customer.id
                              }

                              onToggle={() =>
                                setOpenActionId(
                                  openActionId ===
                                    customer.id
                                    ? null
                                    : customer.id
                                )
                              }
                            />

                          </div>

                        </div>

                      </div>

                    </div>

                  )
                )}

              </div>


              {/* =================================================
                  DESKTOP
              ================================================== */}

              <div className="
                hidden
                overflow-x-auto
                md:block
              ">

                <table className="
                  w-full
                  table-fixed
                ">

                  <colgroup>
                    <col className="w-[84px]" />

                    {/* Name */}
                    <col className="w-[300px]" />

                    {/* Appointment */}
                    <col className="w-[160px]" />

                    {/* Status */}
                    <col className="w-[175px]" />

                    {/* Note */}
                    <col />

                    {/* Action */}
                    <col className="w-[170px]" />
                  </colgroup>


                  {/* Header */}
                  <thead>

                    <tr className="
                      sticky
                      top-0
                      z-10
                      border-b
                      border-gray-100
                      bg-white/95
                      text-left
                      text-sm
                      font-medium
                      text-gray-600
                      backdrop-blur
                    ">

                      <th className="
                        px-4
                        py-4
                        sm:px-6
                      ">
                        Ảnh
                      </th>


                      <th className="
                        px-4
                        py-4
                        sm:px-6
                      ">

                        <button
                          type="button"
                          onClick={() =>
                            toggleSort(
                              'full_name'
                            )
                          }
                          className="
                            flex
                            items-center
                            gap-1
                            font-medium
                            transition
                            hover:text-primary
                          "
                        >
                          Họ tên

                          {getSortIcon(
                            'full_name'
                          )}
                        </button>

                      </th>


                      <th className="
                        px-4
                        py-4
                        sm:px-6
                      ">

                        <button
                          type="button"
                          onClick={() =>
                            toggleSort(
                              'appointment_date'
                            )
                          }
                          className="
                            flex
                            items-center
                            gap-1
                            font-medium
                            transition
                            hover:text-primary
                          "
                        >
                          Ngày tư vấn

                          {getSortIcon(
                            'appointment_date'
                          )}
                        </button>

                      </th>


                      <th className="
                        px-4
                        py-4
                        sm:px-6
                      ">

                        <button
                          type="button"
                          onClick={() =>
                            toggleSort(
                              'status'
                            )
                          }
                          className="
                            flex
                            items-center
                            gap-1
                            font-medium
                            transition
                            hover:text-primary
                          "
                        >
                          Trạng thái

                          {getSortIcon(
                            'status'
                          )}
                        </button>

                      </th>


                      <th className="
                        px-4
                        py-4
                        sm:px-6
                      ">
                        Ghi chú
                      </th>


                      <th className="
                        px-4
                        py-4
                        text-center
                        sm:px-6
                      ">
                        Thao tác
                      </th>

                    </tr>

                  </thead>


                  {/* Body */}
                  <tbody className="
                    divide-y
                    divide-gray-100
                  ">

                    {paginatedCustomers.map(
                      (customer) => (

                        <tr
                          key={
                            customer.id
                          }
                          className="
                            group
                            border-b
                            border-gray-100
                            transition-colors
                            hover:bg-gray-50/70
                          "
                        >


                          {/* Image */}
                          <td className="
                            px-4
                            py-4
                            align-top
                            sm:px-6
                          ">

                            {customer.pfp_url ? (

                              <img
                                src={
                                  customer.pfp_url
                                }
                                alt=""
                                className="
                                  h-11
                                  w-11
                                  rounded-2xl
                                  object-cover
                                  ring-2
                                  ring-gray-100
                                "
                              />

                            ) : (

                              <div className="
                                flex
                                h-11
                                w-11
                                items-center
                                justify-center
                                rounded-2xl
                                bg-gray-200
                                text-xs
                                font-semibold
                                text-gray-500
                              ">
                                {getInitials(
                                  customer.full_name
                                )}
                              </div>

                            )}

                          </td>


                          {/* Name + phone + birth year */}
                          <td className="
                            px-4
                            py-4
                            align-top
                            sm:px-6
                          ">

                            <div className="
                              min-w-0
                            ">

                              <p className="
                                truncate
                                text-sm
                                font-semibold
                                text-gray-900
                              ">
                                {
                                  customer.full_name
                                }
                              </p>


                              {/* Phone */}
                              <div className="
                                mt-1.5
                                flex
                                items-center
                                gap-2
                                text-xs
                                text-gray-600
                              ">

                                <Phone
                                  className="
                                    h-3.5
                                    w-3.5
                                    shrink-0
                                    text-gray-400
                                  "
                                />

                                <span className="
                                  truncate
                                ">
                                  {
                                    customer.phone ||
                                    '—'
                                  }
                                </span>

                              </div>


                              {/* Telesales */}
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Telesale:</span>
                                {customer.telesales?.length ? customer.telesales.map((t) => <span key={t.id} className="inline-flex items-center rounded-full bg-[#025899]/10 px-2 py-0.5 text-[11px] font-semibold text-[#025899]">{t.name}</span>) : <span className="text-[11px] text-gray-400">Chưa phân công</span>}
                              </div>

                              {/* Birth year */}
                              <div className="
                                mt-1
                                flex
                                items-center
                                gap-2
                                text-xs
                                text-gray-500
                              ">

                                <Cake
                                  className="
                                    h-3.5
                                    w-3.5
                                    shrink-0
                                    text-gray-400
                                  "
                                />

                                <span>
                                  Năm sinh:{' '}
                                  {
                                    customer.birth_year ||
                                    '—'
                                  }
                                </span>

                              </div>


                              {/* ID */}
                              <div className="
                                mt-1
                                truncate
                                text-[11px]
                                text-gray-400
                              ">
                                Mã:{' '}
                                <span className="
                                  font-medium
                                ">
                                  {
                                    customer.id
                                  }
                                </span>
                              </div>

                            </div>

                          </td>


                          {/* Appointment */}
                          <td className="
                            px-4
                            py-4
                            align-top
                            text-sm
                            text-gray-600
                            sm:px-6
                          ">

                            <div className="
                              flex
                              items-center
                              gap-2
                            ">

                              <CalendarDays
                                className="
                                  h-3.5
                                  w-3.5
                                  shrink-0
                                  text-gray-400
                                "
                              />

                              <span>
                                {formatDate(
                                  customer.appointment_date
                                )}
                              </span>

                            </div>

                          </td>


                          {/* Status */}
                          <td className="
                            px-4
                            py-4
                            align-top
                            sm:px-6
                          ">

                            <select
                              value={normalizeStatus(
                                customer.status
                              )}
                              onChange={(e) =>
                                handleStatusChange(
                                  customer.id,
                                  e.target.value
                                )
                              }
                              disabled={
                                statusUpdatingId ===
                                customer.id
                              }
                              className={`
                                w-full
                                max-w-[190px]
                                rounded-full
                                border-0
                                px-3
                                py-1.5
                                text-xs
                                font-semibold
                                ring-1
                                outline-none
                                transition-colors

                                ${getStatusStyle(
                                  customer.status
                                )}
                              `}
                            >

                              {STATUS_OPTIONS
                                .filter(
                                  (s) =>
                                    s.value !==
                                    'all'
                                )
                                .map(
                                  (option) => (
                                    <option
                                      key={
                                        option.value
                                      }
                                      value={
                                        option.value
                                      }
                                    >
                                      {
                                        option.label
                                      }
                                    </option>
                                  )
                                )}

                            </select>

                          </td>


                          {/* Note */}
                          <td className="
                            px-4
                            py-4
                            align-top
                            sm:px-6
                          ">

                            <div className="
                              line-clamp-3
                              whitespace-pre-wrap
                              break-words
                              text-sm
                              leading-6
                              text-gray-600
                            ">
                              {
                                customer.note ||
                                '—'
                              }
                            </div>

                          </td>


                          {/* Actions */}
                          <td className="
                            px-4
                            py-4
                            align-top
                            sm:px-6
                          ">

                            <div className="
                              flex
                              justify-center
                              gap-2
                            ">

                              {/* Hồ sơ */}
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/patient/${customer.id}/incidents`
                                  )
                                }
                                className="
                                  inline-flex
                                  h-10
                                  shrink-0
                                  items-center
                                  gap-2
                                  whitespace-nowrap
                                  rounded-xl
                                  bg-primary
                                  px-4
                                  text-sm
                                  font-medium
                                  text-white
                                  shadow-sm
                                  transition
                                  hover:-translate-y-[1px]
                                  hover:shadow-md
                                "
                              >

                                <ClipboardList
                                  className="
                                    h-4
                                    w-4
                                    shrink-0
                                  "
                                />

                                <span className="
                                  whitespace-nowrap
                                ">
                                  Hồ sơ
                                </span>

                              </button>


                              {/* Quick menu */}
                              <ActionMenu
                                customer={
                                  customer
                                }

                                onEdit={
                                  handleEdit
                                }

                                onDelete={
                                  handleDelete
                                }

                                onOpenIncidents={(
                                  c
                                ) =>
                                  navigate(
                                    `/patient/${c.id}/incidents`
                                  )
                                }

                                onOpenInvoices={(
                                  c
                                ) =>
                                  navigate(
                                    `/patient/${c.id}/invoices`
                                  )
                                }

                                open={
                                  openActionId ===
                                  customer.id
                                }

                                onToggle={() =>
                                  setOpenActionId(
                                    openActionId ===
                                      customer.id
                                      ? null
                                      : customer.id
                                  )
                                }
                              />

                            </div>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>


              {/* =================================================
                  PAGINATION
              ================================================== */}

              <div className="
                flex
                flex-col
                gap-3
                border-t
                border-gray-100
                bg-gray-50/40
                px-4
                py-4
                sm:flex-row
                sm:items-center
                sm:justify-between
                sm:px-6
              ">

                <p className="
                  text-sm
                  text-gray-600
                ">

                  Trang{' '}

                  <span className="
                    font-semibold
                  ">
                    {safeCurrentPage}
                  </span>

                  {' '} / {' '}

                  <span className="
                    font-semibold
                  ">
                    {totalPages}
                  </span>

                  {' '} · Tổng {' '}

                  <span className="
                    font-semibold
                  ">
                    {
                      filteredCustomers.length
                    }
                  </span>

                  {' '} bệnh nhân

                </p>


                <div className="
                  flex
                  items-center
                  gap-2
                ">


                  {/* Previous */}
                  <button
                    type="button"
                    disabled={
                      safeCurrentPage <=
                      1
                    }
                    onClick={() =>
                      setCurrentPage(
                        (prev) =>
                          Math.max(
                            1,
                            prev - 1
                          )
                      )
                    }
                    className="
                      inline-flex
                      h-10
                      items-center
                      gap-2
                      rounded-xl
                      border
                      border-gray-200
                      bg-white
                      px-3.5
                      text-sm
                      font-medium
                      text-gray-700
                      transition
                      hover:bg-gray-50
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >

                    <ChevronLeft
                      className="
                        h-4
                        w-4
                      "
                    />

                    Trước

                  </button>


                  {/* Page numbers */}
                  <div className="
                    hidden
                    items-center
                    gap-1
                    sm:flex
                  ">

                    {Array.from(
                      {
                        length:
                          totalPages,
                      },
                      (_, i) =>
                        i + 1
                    )
                      .slice(
                        Math.max(
                          0,
                          safeCurrentPage -
                            3
                        ),
                        Math.min(
                          totalPages,
                          safeCurrentPage +
                            2
                        )
                      )
                      .map(
                        (page) => (

                          <button
                            key={
                              page
                            }
                            type="button"
                            onClick={() =>
                              setCurrentPage(
                                page
                              )
                            }
                            className={`
                              h-10
                              min-w-10
                              rounded-xl
                              px-3
                              text-sm
                              font-medium
                              transition

                              ${
                                page ===
                                safeCurrentPage
                                  ? `
                                    bg-primary
                                    text-white
                                    shadow-sm
                                  `
                                  : `
                                    border
                                    border-gray-200
                                    bg-white
                                    text-gray-700
                                    hover:bg-gray-50
                                  `
                              }
                            `}
                          >
                            {page}
                          </button>

                        )
                      )}

                  </div>


                  {/* Next */}
                  <button
                    type="button"
                    disabled={
                      safeCurrentPage >=
                      totalPages
                    }
                    onClick={() =>
                      setCurrentPage(
                        (prev) =>
                          Math.min(
                            totalPages,
                            prev + 1
                          )
                      )
                    }
                    className="
                      inline-flex
                      h-10
                      items-center
                      gap-2
                      rounded-xl
                      border
                      border-gray-200
                      bg-white
                      px-3.5
                      text-sm
                      font-medium
                      text-gray-700
                      transition
                      hover:bg-gray-50
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >

                    Sau

                    <ChevronRight
                      className="
                        h-4
                        w-4
                      "
                    />

                  </button>

                </div>

              </div>

            </>

          )}

        </div>


        {/* ==================================================
            MODAL
        ================================================== */}

        {isModalOpen && (

          <div className="
            fixed
            inset-0
            z-40
            flex
            items-center
            justify-center
            bg-black/40
            px-4
            py-6
            backdrop-blur-sm
          ">

            <div className="
              max-h-[92vh]
              w-full
              max-w-4xl
              overflow-y-auto
              rounded-3xl
              bg-white
              p-6
              shadow-2xl
              sm:p-8
            ">


              {/* Modal header */}
              <div className="
                mb-5
                flex
                items-start
                justify-between
                gap-3
              ">

                <div className="
                  flex
                  items-center
                  gap-3
                ">

                  <div className="
                    flex
                    h-11
                    w-11
                    items-center
                    justify-center
                    rounded-2xl
                    bg-primary/10
                    text-primary
                  ">
                    <UserPlus
                      className="
                        h-5
                        w-5
                      "
                    />
                  </div>


                  <div>

                    <h3 className="
                      text-base
                      font-semibold
                      text-gray-900
                    ">
                      {editingId
                        ? 'Cập nhật bệnh nhân'
                        : 'Thêm bệnh nhân mới'}
                    </h3>


                    <p className="
                      text-xs
                      text-gray-500
                    ">
                      {editingId
                        ? 'Chỉnh sửa thông tin và lưu lại.'
                        : 'Nhập thông tin bệnh nhân mới.'}
                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  onClick={() => {
                    resetForm();

                    setIsModalOpen(
                      false
                    );
                  }}
                  className="
                    rounded-full
                    p-2
                    text-gray-400
                    transition
                    hover:bg-gray-100
                    hover:text-gray-600
                  "
                >
                  <X
                    className="
                      h-5
                      w-5
                    "
                  />
                </button>

              </div>


              {/* Form */}
              <form
                onSubmit={
                  handleSubmit
                }
                className="
                  space-y-5
                "
              >


                {/* Name + birth */}
                <div className="
                  grid
                  gap-4
                  sm:grid-cols-2
                ">

                  <div className="
                    sm:col-span-2
                    lg:col-span-1
                  ">

                    <label className="
                      mb-1.5
                      block
                      text-sm
                      font-medium
                      text-gray-700
                    ">
                      Họ và tên
                    </label>


                    <input
                      type="text"
                      required
                      placeholder="
                        Họ và tên
                      "
                      className="
                        input-portal
                      "
                      value={
                        formData.name
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          name:
                            e.target.value,
                        })
                      }
                    />

                  </div>


                  <div>

                    <label className="
                      mb-1.5
                      block
                      text-sm
                      font-medium
                      text-gray-700
                    ">
                      Năm sinh
                    </label>


                    <input
                      type="date"
                      className="
                        input-portal
                      "
                      value={
                        formData.dob
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dob:
                            e.target.value,
                        })
                      }
                    />

                  </div>

                </div>


                {/* Appointment + phone */}
                <div className="
                  grid
                  gap-4
                  sm:grid-cols-2
                ">

                  <div>

                    <label className="
                      mb-1.5
                      block
                      text-sm
                      font-medium
                      text-gray-700
                    ">
                      Ngày tư vấn lần đầu
                    </label>


                    <input
                      type="date"
                      className="
                        input-portal
                      "
                      value={
                        formData.appointment_date
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          appointment_date:
                            e.target.value,
                        })
                      }
                    />

                  </div>


                  <div>

                    <label className="
                      mb-1.5
                      block
                      text-sm
                      font-medium
                      text-gray-700
                    ">
                      Số điện thoại
                    </label>


                    <input
                      type="text"
                      required
                      placeholder="
                        Số điện thoại
                      "
                      className="
                        input-portal
                      "
                      value={
                        formData.contact
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contact:
                            e.target.value,
                        })
                      }
                    />

                  </div>

                </div>


                {/* Telesales */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Telesale phụ trách <span className="text-xs font-normal text-gray-400">(tối đa 2)</span></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[0, 1].map((index) => (
                      <select key={index} className="input-portal" value={formData.telesale_ids?.[index] || ''} onChange={(e) => {
                        const next = [...(formData.telesale_ids || [])];
                        if (e.target.value) next[index] = e.target.value; else next.splice(index, 1);
                        setFormData({ ...formData, telesale_ids: [...new Set(next.filter(Boolean))].slice(0, 2) });
                      }}>
                        <option value="">{index === 0 ? 'Chọn telesale phụ trách' : 'Không chọn'}</option>
                        {telesales.map((t) => <option key={t.id} value={t.id} disabled={formData.telesale_ids?.includes(t.id) && formData.telesale_ids[index] !== t.id}>{t.name}</option>)}
                      </select>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>

                  <label className="
                    mb-1.5
                    block
                    text-sm
                    font-medium
                    text-gray-700
                  ">
                    Trạng thái
                  </label>


                  <select
                    className="
                      input-portal
                    "
                    value={
                      formData.status
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status:
                          e.target.value,
                      })
                    }
                  >

                    {STATUS_OPTIONS
                      .filter(
                        (s) =>
                          s.value !==
                          'all'
                      )
                      .map(
                        (option) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </option>
                        )
                      )}

                  </select>

                </div>


                {/* Health information */}
                <div>

                  <label className="
                    mb-1.5
                    block
                    text-sm
                    font-medium
                    text-gray-700
                  ">
                    Thông tin sức khỏe
                  </label>


                  <textarea
                    placeholder="
                      Thông tin sức khỏe
                    "
                    className="
                      input-portal
                      min-h-[110px]
                      resize-y
                    "
                    value={
                      formData.healthInfo
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        healthInfo:
                          e.target.value,
                      })
                    }
                  />

                </div>


                {/* Image */}
                <div>

                  <label className="
                    mb-1.5
                    block
                    text-sm
                    font-medium
                    text-gray-700
                  ">
                    Ảnh đại diện
                  </label>


                  <div className="
                    flex
                    flex-wrap
                    items-center
                    gap-4
                  ">

                    <label className="
                      flex
                      cursor-pointer
                      items-center
                      gap-2
                      rounded-2xl
                      border
                      border-gray-200
                      bg-gray-50
                      px-4
                      py-2.5
                      text-sm
                      font-medium
                      text-gray-700
                      transition
                      hover:bg-gray-100
                    ">

                      <ImagePlus
                        className="
                          h-4
                          w-4
                        "
                      />

                      Chọn ảnh

                      <input
                        type="file"
                        accept="image/*"
                        onChange={
                          handleFileChange
                        }
                        className="hidden"
                      />

                    </label>


                    {previewUrl ? (

                      <img
                        src={
                          previewUrl
                        }
                        alt="preview"
                        className="
                          h-16
                          w-16
                          rounded-2xl
                          object-cover
                          ring-2
                          ring-gray-200
                        "
                      />

                    ) : (

                      <div className="
                        flex
                        h-16
                        w-16
                        items-center
                        justify-center
                        rounded-2xl
                        bg-gray-100
                        text-sm
                        font-semibold
                        text-gray-500
                      ">
                        {getInitials(
                          formData.name
                        )}
                      </div>

                    )}

                  </div>

                </div>


                {/* Buttons */}
                <div className="
                  flex
                  flex-wrap
                  justify-end
                  gap-3
                  pt-2
                ">

                  <button
                    type="button"
                    onClick={() => {
                      resetForm();

                      setIsModalOpen(
                        false
                      );
                    }}
                    className="
                      rounded-xl
                      border
                      border-gray-200
                      bg-white
                      px-5
                      py-2.5
                      text-sm
                      font-medium
                      text-gray-700
                      hover:bg-gray-50
                    "
                  >
                    Hủy
                  </button>


                  <button
                    type="submit"
                    disabled={loading}
                    className="
                      btn-primary
                    "
                  >
                    {editingId
                      ? loading
                        ? 'Đang cập nhật...'
                        : 'Cập nhật bệnh nhân'
                      : loading
                        ? 'Đang lưu...'
                        : 'Thêm bệnh nhân'}
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


export default Customers;