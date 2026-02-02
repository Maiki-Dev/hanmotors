
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, LogOut } from 'lucide-react';
import { Button } from './ui/button';

export default function ProtectedRoute({ children }) {
  const { user, profile, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check approval status
  // If profile is null, it might mean the record doesn't exist yet or fetch failed
  // But if we want to enforce approval, we should block access.
  // Assuming 'approved' or 'active' status.
  if (profile && profile.status !== 'approved' && profile.status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center space-y-4">
          <div className="flex justify-center text-yellow-500 mb-2">
            <AlertCircle size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Хүлээгдэж байна</h2>
          <p className="text-gray-600">
            Таны эрх баталгаажаагүй байна. Админ зөвшөөртөл түр хүлээнэ үү.
          </p>
          <div className="pt-4">
             <Button onClick={signOut} variant="outline" className="flex items-center gap-2 mx-auto">
               <LogOut size={16} />
               Гарах
             </Button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
