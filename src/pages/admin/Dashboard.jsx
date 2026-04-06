import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { supabase } from '../../lib/supabase';
import {
  Users,
  Calendar as CalendarIcon,
  CheckCircle,
  TrendingUp,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = ['#025899', '#10b981', '#f97316', '#6366f1', '#e11d48'];

const KPIStatCard = ({ label, value, icon: Icon, description }) => (
  <div className="card-portal group relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    <div className="relative flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">{value}</p>
        {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
      </div>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105 group-hover:shadow-md">
        <Icon className="h-6 w-6" />
      </div>
    </div>
  </div>
);

const ChartCard = ({ title, subtitle, icon: Icon, children }) => (
  <div className="card-portal flex flex-col">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
    <div className="mt-auto h-56 w-full min-h-0 sm:h-64">
      {children}
    </div>
  </div>
);

const AdminDashboard = () => {
  const [totalPatients, setTotalPatients] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState(0);
  const [completedTreatments, setCompletedTreatments] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { count: totalPatients } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    const { count: upcoming } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gt('appointment_time', new Date().toISOString());

    const { data: revenueData } = await supabase
      .from('treatments')
      .select('total_amount, treatment_date');

    const now = new Date();
    const revenue = revenueData
      ?.filter((t) => {
        const d = new Date(t.treatment_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

    setTotalPatients(totalPatients || 0);
    setUpcomingAppointments(upcoming || 0);
    setMonthlyRevenue(revenue || 0);
  };

  // Line chart: doanh thu 6 tháng gần nhất
  const monthlyRevenueTrend = useMemo(() => {
    const map = new Map();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleDateString('vi-VN', { month: 'short' });
      map.set(key, { month: label, revenue: 0 });
    }
    incidents.forEach(i => {
      const date = new Date(i.appointmentDate);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (map.has(key)) {
        const cost = parseFloat(i.cost) || 0;
        map.get(key).revenue += cost;
      }
    });
    return Array.from(map.values());
  }, [incidents]);

  // Bar chart: số lịch hẹn 7 ngày gần nhất
  const appointmentsPerDay = useMemo(() => {
    const map = new Map();
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toDateString();
      const label = d.toLocaleDateString('vi-VN', { weekday: 'short' });
      map.set(key, { day: label, count: 0 });
    }
    incidents.forEach(i => {
      const date = new Date(i.appointmentDate);
      const key = date.toDateString();
      if (map.has(key)) {
        map.get(key).count += 1;
      }
    });
    return Array.from(map.values());
  }, [incidents]);

  // Pie chart: phân bố trạng thái điều trị
  const treatmentStatusData = useMemo(() => {
    const statusCount = new Map();
    incidents.forEach(i => {
      const raw = i.status || 'Khác';
      const s = raw.trim() || 'Khác';
      statusCount.set(s, (statusCount.get(s) || 0) + 1);
    });
    return Array.from(statusCount.entries()).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  const kpis = [
    {
      label: 'Tổng bệnh nhân',
      value: totalPatients,
      icon: Users,
      description: 'Số hồ sơ bệnh nhân đã lưu',
    },
    {
      label: 'Lịch hẹn sắp tới',
      value: upcomingAppointments,
      icon: CalendarIcon,
      description: 'Trong tương lai gần',
    },
    {
      label: 'Điều trị hoàn thành',
      value: completedTreatments,
      icon: CheckCircle,
      description: 'Đã được đánh dấu hoàn tất',
    },
    {
      label: 'Doanh thu tháng (VNĐ)',
      value: monthlyRevenue.toLocaleString('vi-VN'),
      icon: TrendingUp,
      description: 'Tổng doanh thu tháng hiện tại',
    },
  ];

  const today = new Date();
  const formattedDate = today.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <AdminLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Header with date + avatar */}
        <header className="page-header rounded-2xl border border-gray-100 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Bảng điều khiển</p>
            <h1 className="mt-1 page-header-title lg:text-3xl">
              Tổng quan hoạt động phòng khám
            </h1>
            <p className="mt-1 text-sm text-gray-500">{formattedDate}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-gray-900">Quản trị viên</p>
              <p className="text-xs text-gray-500">Nha khoa Phương Sen</p>
            </div>
            <button className="flex items-center gap-2 rounded-full bg-gray-50 px-2 py-1.5 text-left text-sm shadow-sm hover:bg-gray-100 sm:px-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white font-semibold">
                QS
              </div>
              <span className="hidden text-xs text-gray-600 sm:inline">Tùy chọn tài khoản</span>
            </button>
          </div>
        </header>

        {/* KPI row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KPIStatCard key={kpi.label} {...kpi} />
          ))}
        </section>

        {/* Charts row */}
        <section className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
          <div className="space-y-6">
            <ChartCard
              title="Doanh thu theo tháng"
              subtitle="6 tháng gần nhất"
              icon={TrendingUp}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyRevenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                  />
                  <Tooltip
                    formatter={(value) =>
                      `${Number(value).toLocaleString('vi-VN')} VNĐ`
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#025899"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Lịch hẹn theo ngày"
              subtitle="7 ngày gần đây"
              icon={CalendarIcon}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentsPerDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#60a5fa" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard
            title="Trạng thái điều trị"
            subtitle="Phân bố theo số lượng phiếu"
            icon={Activity}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={treatmentStatusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="50%"
                  outerRadius="80%"
                  paddingAngle={3}
                >
                  {treatmentStatusData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ paddingTop: 12 }}
                  formatter={(value) => (
                    <span style={{ fontSize: 11, color: '#4b5563' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
