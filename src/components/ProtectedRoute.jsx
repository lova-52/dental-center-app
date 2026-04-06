import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      const userId = data.session.user.id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (allowedRoles.includes(profile?.role)) {
        setAuthorized(true);
      }

      setLoading(false);
    };

    checkUser();
  }, [allowedRoles]);

  if (loading) {
    return (
      <div className="flex min-h-screen min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        <p className="mt-4 text-sm font-medium text-gray-600 sm:text-base">Đang tải...</p>
      </div>
    );
  }

  if (!authorized) return <Navigate to="/login" />;

  return children;
};

export default ProtectedRoute;
