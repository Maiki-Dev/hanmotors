import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Truck, CreditCard, FileCheck, Menu, X } from 'lucide-react';
import { cn } from "./lib/utils";
import { Button } from "./components/ui/button";

import DashboardOverview from './pages/DashboardOverview';
import DriverManagement from './pages/DriverManagement';
import TripManagement from './pages/TripManagement';
import PaymentsReport from './pages/PaymentsReport';
import DocumentVerification from './pages/DocumentVerification';

const Sidebar = ({ className, onClose }) => {
  const location = useLocation();
  const menuItems = [
    { icon: LayoutDashboard, label: 'Ерөнхий самбар', path: '/' },
    { icon: Users, label: 'Жолоочийн удирдлага', path: '/drivers' },
    { icon: Truck, label: 'Дуудлагын хүсэлтүүд', path: '/requests' },
    { icon: CreditCard, label: 'Төлбөрийн тайлан', path: '/payments' },
    { icon: FileCheck, label: 'Баримт бичиг шалгах', path: '/verification' },
  ];

  return (
    <div className={cn("flex flex-col h-full bg-sidebar text-sidebar-foreground border-r", className)}>
      <div className="h-16 flex items-center px-6 border-b">
        <h1 className="text-2xl font-bold text-primary tracking-wider">XAN MOTORS</h1>
      </div>
      <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary/20 text-primary border border-primary/20" 
                  : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar transition-transform duration-300 md:translate-x-0 border-r",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
        <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 md:hidden text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
        >
            <X className="h-6 w-6" />
        </Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <header className="md:hidden h-16 flex items-center px-4 border-b bg-background sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <span className="ml-4 font-bold text-lg">XAN MOTORS</span>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
          <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/drivers" element={<DriverManagement />} />
            <Route path="/requests" element={<TripManagement />} />
            <Route path="/payments" element={<PaymentsReport />} />
            <Route path="/verification" element={<DocumentVerification />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
