import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PatientLayout from '../../components/PatientLayout';
import { Calendar, ClipboardList, UserCircle, ChevronRight } from 'lucide-react';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [nextAppointment, setNextAppointment] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('loggedInUser'));
    const allPatients = JSON.parse(localStorage.getItem('patients')) || [];
    const allIncidents = JSON.parse(localStorage.getItem('incidents')) || [];

    if (user?.role === 'Patient') {
      const current = allPatients.find(p => p.id === user.patientId);
      setPatient(current);
      const patientIncidents = allIncidents
        .filter(i => i.patientId === user.patientId)
        .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
      setIncidents(patientIncidents);
      const future = patientIncidents.find(i => new Date(i.appointmentDate) > new Date());
      setNextAppointment(future || null);
    }
  }, []);

  const getStatusColor = (status) => {
    const s = status?.toLowerCase();
    if (s === 'done' || s === 'completed') return 'bg-emerald-100 text-emerald-700';
    if (s === 'pending') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <PatientLayout>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="page-header-title lg:text-3xl">
              Xin chào, <span className="text-primary">{patient?.name || 'Bệnh nhân'}</span>
            </h1>
            <p className="mt-1 text-sm text-gray-500">Quản lý lịch hẹn và lịch sử điều trị</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/patient/profile')}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-white px-4 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary/5 active:scale-[0.98]"
          >
            <UserCircle className="h-4 w-4" />
            Chỉnh sửa hồ sơ
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="card-portal border-l-4 border-l-primary">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Lịch hẹn sắp tới</h2>
          </div>
          {nextAppointment ? (
            <div className="rounded-xl bg-gray-50/80 p-4">
              <p className="font-semibold text-gray-800">{nextAppointment.title}</p>
              <p className="mt-1 text-sm text-gray-600">
                🕒 {new Date(nextAppointment.appointmentDate).toLocaleString('vi-VN')}
              </p>
              {nextAppointment.description && (
                <p className="mt-2 text-sm text-gray-600">💬 {nextAppointment.description}</p>
              )}
            </div>
          ) : (
            <p className="rounded-xl bg-gray-50/80 p-4 text-gray-500">Không có lịch hẹn sắp tới.</p>
          )}
        </div>

        <div className="card-portal">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Điều trị gần đây</h2>
          </div>
          {incidents.length === 0 ? (
            <p className="rounded-xl bg-gray-50/80 p-6 text-center text-gray-500">Chưa có lịch sử điều trị.</p>
          ) : (
            <ul className="space-y-4">
              {incidents.slice(0, 5).map((i) => (
                <li
                  key={i.id}
                  className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-800">{i.title}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(i.status)}`}>
                        {i.status || 'Chưa rõ'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      🧾 {i.treatment} • {i.cost != null && !isNaN(i.cost) ? Number(i.cost).toLocaleString('vi-VN') + ' VNĐ' : '—'}
                    </p>
                    <p className="text-xs text-gray-500">📅 {new Date(i.appointmentDate).toLocaleDateString('vi-VN')}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PatientLayout>
  );
};

export default PatientDashboard;
