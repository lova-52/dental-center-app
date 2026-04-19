// src/pages/admin/Dashboard.jsx
// Dashboard quản trị phòng khám

import React, { useEffect, useMemo, useState } from "react";
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
  Bell,
  Package
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

const COLORS = ["#025899", "#10b981", "#f97316", "#6366f1", "#e11d48"];

/* =========================================================
   KPI CARD
========================================================= */

const KPIStatCard = ({ label, value, icon: Icon, description, to }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(to)}
      className="card-portal group relative cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-[2px]"
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

          <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
            {description}
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition" />
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

const ChartCard = ({ title, subtitle, icon: Icon, children }) => (
  <div className="card-portal flex flex-col">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>

    <div className="h-56 sm:h-64 w-full">{children}</div>
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
  const [upcomingAppointments, setUpcomingAppointments] = useState(0);
  const [completedTreatments, setCompletedTreatments] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: patientData } = await supabase.from("customers").select("*");
    const { data: appointmentData } = await supabase.from("appointments").select("*");
    const { data: treatmentData } = await supabase.from("treatments").select("*");
    const { data: movementData } = await supabase.from("inventory_movements").select("*");

    setPatients(patientData || []);
    setAppointments(appointmentData || []);
    setTreatments(treatmentData || []);
    setMovements(movementData || []);

    setTotalPatients(patientData?.length || 0);

    const upcoming = appointmentData?.filter(
      (a) => new Date(a.appointment_time) > new Date()
    );

    setUpcomingAppointments(upcoming?.length || 0);

    const completed = treatmentData?.filter((t) => t.status === "completed");

    setCompletedTreatments(completed?.length || 0);

    const now = new Date();

    const revenue =
      treatmentData
        ?.filter((t) => {
          const d = new Date(t.treatment_date);
          return (
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        })
        .reduce((sum, t) => sum + Number(t.total_amount || 0), 0) || 0;

    setMonthlyRevenue(revenue);
  };

  const monthlyRevenueTrend = useMemo(() => {
    const map = new Map();
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

      const key = `${d.getFullYear()}-${d.getMonth()}`;

      map.set(key, {
        month: d.toLocaleDateString("vi-VN", { month: "short" }),
        revenue: 0,
      });
    }

    treatments.forEach((t) => {
      const d = new Date(t.treatment_date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;

      if (map.has(key)) map.get(key).revenue += Number(t.total_amount || 0);
    });

    return Array.from(map.values());
  }, [treatments]);

  const treatmentStatusData = useMemo(() => {
    const map = new Map();

    treatments.forEach((t) => {
      const s = t.status || "Khác";
      map.set(s, (map.get(s) || 0) + 1);
    });

    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [treatments]);

  const allKpis = [
    {
      label: "Tổng bệnh nhân",
      value: totalPatients,
      icon: Users,
      description: "Xem danh sách bệnh nhân",
      to: "/patients",
      roles: ["admin", "developers", "telesale"],
    },
    {
      label: "Lịch hẹn sắp tới",
      value: upcomingAppointments,
      icon: CalendarIcon,
      description: "Xem lịch hẹn",
      to: "/calendar",
      roles: ["admin", "developers", "telesale"],
    },
    {
      label: "Điều trị hoàn thành",
      value: completedTreatments,
      icon: CheckCircle,
      description: "Xem phiếu điều trị",
      to: "/treatments",
      roles: ["admin", "developers"],
    },
    {
      label: "Doanh thu tháng",
      value: monthlyRevenue.toLocaleString("vi-VN") + " ₫",
      icon: TrendingUp,
      description: "Thống kê doanh thu",
      to: "/revenue",
      roles: ["admin", "developers"],
    },
    {
      label: "Phiếu vật tư",
      value: movements.length,
      icon: Package,
      description: "Xem quản lý vật tư",
      to: "/inventory/movements",
      roles: ["admin", "developers", "assistant"],
    },
  ];

  const kpis = allKpis.filter((kpi) => !kpi.roles || kpi.roles.includes(role));

  const recentPatients = useMemo(() => {
    return [...patients]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
  }, [patients]);

  const today = new Date();

  const formattedDate = today.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <AdminLayout>
      <div className="space-y-6 sm:space-y-8">

        {/* HEADER */}

        <div className="flex items-center justify-between">
          <div className="page-header sm:mb-2">
            <div className="page-header-main">
              <div className="page-header-icon">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>

              <div>
                <h2 className="page-header-title">Bảng điều khiển</h2>
                <p className="page-header-subtitle">{formattedDate}</p>
              </div>
            </div>
          </div>

          {/* BUTTON ENABLE PUSH */}

          <EnableNotification />
        </div>

        {/* KPI */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KPIStatCard key={kpi.label} {...kpi} />
          ))}
        </section>

        {/* CHARTS */}

        {['admin', 'developers'].includes(role) && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <ChartCard
                title="Doanh thu theo tháng"
                subtitle="6 tháng gần nhất"
                icon={TrendingUp}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyRevenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
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
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={treatmentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {treatmentStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>
        )}

        {/* RECENT PATIENTS */}

        {['admin', 'developers', 'telesale'].includes(role) && (
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
                onClick={() => navigate("/patients")}
                className="text-xs font-medium text-primary hover:underline"
              >
                Xem tất cả
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400">
                    <th className="pb-3 font-medium">Họ tên</th>
                    <th className="pb-3 font-medium">Số điện thoại</th>
                    <th className="pb-3 font-medium text-right">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentPatients.map((p) => (
                    <tr key={p.id} className="group hover:bg-gray-50/50">
                      <td className="py-3 font-medium text-gray-900">
                        {p.full_name}
                      </td>
                      <td className="py-3 text-gray-500">{p.phone}</td>
                      <td className="py-3 text-right text-gray-400">
                        {new Date(p.created_at).toLocaleDateString("vi-VN")}
                      </td>
                    </tr>
                  ))}
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