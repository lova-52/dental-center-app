//path: src/components/AdminLayout.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Boxes, Calendar, LayoutDashboard, LogOut, Menu, Package, Stethoscope, Truck, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('loggedInUser');
    navigate('/login');
  };

  const allNavItems = [
    { type: 'link', path: '/', label: 'Trang chủ', icon: LayoutDashboard, end: true, roles: ['admin', 'developers', 'telesale', 'assistant'] },
    { type: 'link', path: '/patients', label: 'Bệnh nhân', icon: Users, roles: ['admin', 'developers', 'telesale'] },
    { type: 'link', path: '/calendar', label: 'Lịch hẹn', icon: Calendar, roles: ['admin', 'developers', 'telesale'] },
    {
      type: 'group',
      path: '/inventory',
      label: 'Quản lý vật tư',
      icon: Boxes,
      roles: ['admin', 'developers', 'assistant'],
      children: [
        { path: '/inventory/movements', label: 'Phiếu', icon: Package },
        { path: '/inventory/items', label: 'Danh mục vật tư', icon: Package },
        { path: '/inventory/suppliers', label: 'Nhà cung cấp', icon: Truck },
      ],
    },
  ];

  const navItems = allNavItems.filter((item) => !item.roles || item.roles.includes(role));

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50/80">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200/80 bg-white shadow-xl transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-3 border-b border-gray-100 px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="font-bold text-gray-800">Quản trị</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const baseLink = 'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all';
            const activeLink = 'bg-primary text-white shadow-md';
            const inactiveLink = 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';

            if (item.type === 'group') {
              const groupActive = location.pathname.startsWith(item.path);
              return (
                <div key={item.path} className="space-y-1">
                  <NavLink
                    to={item.path}
                    end={false}
                    className={`${baseLink} ${groupActive ? activeLink : inactiveLink}`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </NavLink>

                  <div className="ml-2 space-y-1 border-l border-gray-200/80 pl-2">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          end={false}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                              isActive ? activeLink : inactiveLink
                            }`
                          }
                        >
                          <ChildIcon className="h-4 w-4 shrink-0 opacity-80" />
                          {child.label}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `${baseLink} ${isActive ? activeLink : inactiveLink}`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-gray-100 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition-all hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-5 w-5" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 flex-1 lg:ml-64">
        <header
          className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200/80 bg-white/95 px-4 shadow-sm backdrop-blur-md lg:hidden"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Mở menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <Stethoscope className="h-4 w-4" />
            </div>
            <span className="font-bold text-gray-800">Quản trị</span>
          </div>
        </header>
        <main className="min-h-screen">
          <div className="page-shell">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
