import React, { useEffect, useState } from 'react';
import PatientLayout from '../../components/PatientLayout';
import { User } from 'lucide-react';

const Profile = () => {
  const [patient, setPatient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    contact: '',
    email: '',
    healthInfo: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('loggedInUser'));
    const allPatients = JSON.parse(localStorage.getItem('patients')) || [];

    if (user?.role === 'Patient') {
      const current = allPatients.find(p => p.id === user.patientId);
      if (current) {
        setPatient(current);
        setFormData(current);
      }
    }
    setLoading(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(formData.contact)) {
      alert('📱 Số điện thoại phải đúng 10 chữ số.');
      return;
    }
    const allPatients = JSON.parse(localStorage.getItem('patients')) || [];
    const updated = allPatients.map(p =>
      p.id === patient?.id ? { ...p, ...formData } : p
    );
    localStorage.setItem('patients', JSON.stringify(updated));
    alert('✅ Cập nhật hồ sơ thành công!');
  };

  if (loading) {
    return (
      <PatientLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="mt-4 text-gray-500">Đang tải hồ sơ...</p>
        </div>
      </PatientLayout>
    );
  }

  if (!patient) {
    return (
      <PatientLayout>
        <div className="card-portal max-w-xl mx-auto text-center py-12">
          <p className="text-red-600 font-medium">❌ Không tìm thấy bệnh nhân.</p>
        </div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout>
      <div className="mx-auto max-w-xl">
        <div className="card-portal">
          <div className="mb-6 flex items-center gap-3 sm:mb-8">
            <div className="page-header-icon sm:h-12 sm:w-12">
              <User className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="page-header-title">Hồ sơ của tôi</h2>
              <p className="page-header-subtitle">Cập nhật thông tin cá nhân</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Họ và tên</label>
              <input
                type="text"
                value={formData.name}
                className="input-portal"
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Ngày sinh</label>
              <input
                type="date"
                value={formData.dob}
                className="input-portal"
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Số điện thoại</label>
              <input
                type="text"
                value={formData.contact}
                className="input-portal"
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                required
                pattern="\d{10}"
                title="Phải là số 10 chữ số"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                className="input-portal"
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Thông tin sức khỏe</label>
              <textarea
                value={formData.healthInfo}
                className="input-portal min-h-[100px] resize-y"
                onChange={(e) => setFormData({ ...formData, healthInfo: e.target.value })}
                rows={4}
              />
            </div>
            <button type="submit" className="btn-primary w-full py-3">
              Lưu thay đổi
            </button>
          </form>
        </div>
      </div>
    </PatientLayout>
  );
};

export default Profile;
