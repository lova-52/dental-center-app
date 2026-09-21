// File: src/pages/admin/Dashboard.jsx
// Dashboard quản trị phòng khám

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import AdminLayout from "../../components/AdminLayout";

import { supabase } from "../../lib/supabase";

import EnableNotification from "../../components/EnableNotification";

import { useAuth } from "../../context/AuthContext";

import {
  Users,
  Calendar as CalendarIcon,
  CheckCircle,
  TrendingUp,
  Activity,
  ArrowRight,
  Package,
} from "lucide-react";

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "#025899",
  "#10b981",
  "#f97316",
  "#6366f1",
  "#e11d48",
];

/* =========================================================
   KPI CARD
========================================================= */

const KPIStatCard = ({
  label,
  value,
  icon: Icon,
  description,
  to,
}) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(to)}
      className="card-portal group relative cursor-pointer overflow-hidden transition-all hover:-translate-y-[2px] hover:shadow-lg"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            {value}
          </p>

          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            {description}

            <ArrowRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   CHART CARD
========================================================= */

const ChartCard = ({
  title,
  subtitle,
  icon: Icon,
  children,
}) => (
  <div className="card-portal flex flex-col">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900">
          {title}
        </h3>

        {subtitle && (
          <p className="text-xs text-gray-500">
            {subtitle}
          </p>
        )}
      </div>
    </div>

    <div className="h-56 w-full sm:h-64">
      {children}
    </div>
  </div>
);

/* =========================================================
   MAIN DASHBOARD
========================================================= */

const Dashboard = () => {
  const navigate = useNavigate();

  const { role } = useAuth();

  const [patients, setPatients] = useState([]);

  const [appointments, setAppointments] = useState([]);

  const [treatments, setTreatments] = useState([]);

  const [movements, setMovements] = useState([]);

  const [totalPatients, setTotalPatients] = useState(0);

  const [
    upcomingAppointments,
    setUpcomingAppointments,
  ] = useState(0);

  const [
    completedTreatments,
    setCompletedTreatments,
  ] = useState(0);

  const [
    monthlyRevenue,
    setMonthlyRevenue,
  ] = useState(0);

  /*
  |--------------------------------------------------------------------------
  | FETCH DATA
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const {
      data: patientData,
    } = await supabase
      .from("customers")
      .select("*");

    const {
      data: appointmentData,
    } = await supabase
      .from("appointments")
      .select("*");

    const {
      data: treatmentData,
    } = await supabase
      .from("treatments")
      .select("*");

    const {
      data: movementData,
    } = await supabase
      .from("inventory_movements")
      .select("*");

    setPatients(patientData || []);

    setAppointments(appointmentData || []);

    setTreatments(treatmentData || []);

    setMovements(movementData || []);

    setTotalPatients(
      patientData?.length || 0
    );

    /*
    |--------------------------------------------------------------------------
    | UPCOMING APPOINTMENTS
    |--------------------------------------------------------------------------
    */

    const upcoming =
      appointmentData?.filter(
        (appointment) =>
          new Date(
            appointment.appointment_time
          ) > new Date() &&
          appointment.status !== "cancelled"
      );

    setUpcomingAppointments(
      upcoming?.length || 0
    );

    /*
    |--------------------------------------------------------------------------
    | COMPLETED PATIENTS
    |--------------------------------------------------------------------------
    */

    const completed =
      patientData?.filter(
        (patient) =>
          String(
            patient.status || ""
          )
            .trim()
            .toLowerCase() === "done"
      );

    setCompletedTreatments(
      completed?.length || 0
    );

    /*
    |--------------------------------------------------------------------------
    | MONTHLY REVENUE
    |--------------------------------------------------------------------------
    */

    const now = new Date();

    const revenue =
      treatmentData
        ?.filter((treatment) => {
          const date = new Date(
            treatment.treatment_date
          );

          return (
            date.getMonth() ===
              now.getMonth() &&
            date.getFullYear() ===
              now.getFullYear()
          );
        })
        .reduce(
          (sum, treatment) =>
            sum +
            Number(
              treatment.total_amount || 0
            ),
          0
        ) || 0;

    setMonthlyRevenue(revenue);
  };

  /*
  |--------------------------------------------------------------------------
  | MONTHLY REVENUE TREND
  |--------------------------------------------------------------------------
  */

  const monthlyRevenueTrend =
    useMemo(() => {
      const map = new Map();

      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const date = new Date(
          now.getFullYear(),
          now.getMonth() - i,
          1
        );

        const key = `${date.getFullYear()}-${date.getMonth()}`;

        map.set(key, {
          month:
            date.toLocaleDateString(
              "vi-VN",
              {
                month: "short",
              }
            ),

          revenue: 0,
        });
      }

      treatments.forEach((treatment) => {
        const date = new Date(
          treatment.treatment_date
        );

        const key = `${date.getFullYear()}-${date.getMonth()}`;

        if (map.has(key)) {
          map.get(key).revenue += Number(
            treatment.total_amount || 0
          );
        }
      });

      return Array.from(map.values());
    }, [treatments]);

  /*
  |--------------------------------------------------------------------------
  | TREATMENT STATUS
  |--------------------------------------------------------------------------
  */

  const treatmentStatusData =
    useMemo(() => {
      const map = new Map();

      treatments.forEach((treatment) => {
        const status =
          treatment.status || "Khác";

        map.set(
          status,
          (map.get(status) || 0) + 1
        );
      });

      return Array.from(
        map.entries()
      ).map(([name, value]) => ({
        name,
        value,
      }));
    }, [treatments]);

  /*
  |--------------------------------------------------------------------------
  | KPI
  |--------------------------------------------------------------------------
  */

  const allKpis = [
    {
      label: "Tổng bệnh nhân",

      value: totalPatients,

      icon: Users,

      description:
        "Xem danh sách bệnh nhân",

      to: "/patients",

      roles: [
        "admin",
        "developers",
        "telesale",
        "receptionist",
      ],
    },

    {
      label: "Lịch hẹn sắp tới",

      value: upcomingAppointments,

      icon: CalendarIcon,

      description: "Xem lịch hẹn",

      to: "/calendar",

      roles: [
        "admin",
        "developers",
        "telesale",
        "receptionist",
      ],
    },

    {
      label:
        "Bệnh nhân hoàn thành điều trị",

      value: completedTreatments,

      icon: CheckCircle,

      description:
        "Xem bệnh nhân đã hoàn thành điều trị",

      to: "/patients?status=done",

      roles: [
        "admin",
        "developers",
        "receptionist",
      ],
    },

    {
      label: "Doanh thu tháng",

      value:
        monthlyRevenue.toLocaleString(
          "vi-VN"
        ) + " ₫",

      icon: TrendingUp,

      description:
        "Thống kê doanh thu",

      to: "/revenue",

      roles: [
        "admin",
        "developers",
        "receptionist",
      ],
    },

    {
      label: "Phiếu vật tư",

      value: movements.length,

      icon: Package,

      description:
        "Xem quản lý vật tư",

      to: "/inventory/movements",

      roles: [
        "admin",
        "developers",
        "assistant",
        "receptionist",
      ],
    },
  ];

  const kpis =
    allKpis.filter(
      (kpi) =>
        !kpi.roles ||
        kpi.roles.includes(role)
    );

  /*
  |--------------------------------------------------------------------------
  | RECENT PATIENTS
  |--------------------------------------------------------------------------
  */

  const recentPatients =
    useMemo(() => {
      return [...patients]
        .sort(
          (a, b) =>
            new Date(b.created_at) -
            new Date(a.created_at)
        )
        .slice(0, 5);
    }, [patients]);

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <AdminLayout>
      <div className="space-y-6 sm:space-y-8">

        {/* ================================================================
            UPCOMING APPOINTMENT NOTIFICATION
        ================================================================ */}

        <div className="flex justify-end">
          <EnableNotification />
        </div>

        {/* ================================================================
            KPI
        ================================================================ */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KPIStatCard
              key={kpi.label}
              {...kpi}
            />
          ))}
        </section>

        {/* ================================================================
            CHARTS
        ================================================================ */}

        {[
          "admin",
          "developers",
          "telesale",
          "receptionist",
        ].includes(role) && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">

            <div className="space-y-6">
              <ChartCard
                title="Doanh thu theo tháng"
                subtitle="6 tháng gần nhất"
                icon={TrendingUp}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={
                      monthlyRevenueTrend
                    }
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="month"
                    />

                    <YAxis />

                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#025899"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <ChartCard
              title="Trạng thái điều trị"
              subtitle="Phân bố"
              icon={Activity}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={
                      treatmentStatusData
                    }
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {treatmentStatusData.map(
                      (
                        entry,
                        index
                      ) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            COLORS[
                              index %
                                COLORS.length
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip />

                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

          </section>
        )}

        {/* ================================================================
            RECENT PATIENTS
        ================================================================ */}

        {[
          "admin",
          "developers",
          "telesale",
          "receptionist",
        ].includes(role) && (
          <section className="card-portal">

            <div className="mb-4 flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>

                <h3 className="text-sm font-semibold text-gray-900">
                  Bệnh nhân mới nhất
                </h3>

              </div>

              <button
                type="button"
                onClick={() =>
                  navigate("/patients")
                }
                className="text-xs font-medium text-primary hover:underline"
              >
                Xem tất cả
              </button>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead>
                  <tr className="border-b border-gray-100 text-gray-400">

                    <th className="pb-3 font-medium">
                      Họ tên
                    </th>

                    <th className="pb-3 font-medium">
                      Số điện thoại
                    </th>

                    <th className="pb-3 text-right font-medium">
                      Ngày tạo
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">

                  {recentPatients.map(
                    (patient) => (
                      <tr
                        key={patient.id}
                        className="group hover:bg-gray-50/50"
                      >

                        <td className="py-3 font-medium text-gray-900">
                          {patient.full_name}
                        </td>

                        <td className="py-3 text-gray-500">
                          {patient.phone}
                        </td>

                        <td className="py-3 text-right text-gray-400">
                          {new Date(
                            patient.created_at
                          ).toLocaleDateString(
                            "vi-VN"
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>
        )}

      </div>
    </AdminLayout>
  );
};

export default Dashboard;
