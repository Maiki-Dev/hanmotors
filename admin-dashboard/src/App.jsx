import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Truck, CreditCard, FileCheck, Menu, X, Settings, LogOut, ChevronRight, Calculator } from 'lucide-react';
import { cn } from "./lib/utils";
import { Button } from "./components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";

import DashboardOverview from './pages/DashboardOverview';
import DriverManagement from './pages/DriverManagement';
import TripManagement from './pages/TripManagement';
import PricingRules from './pages/PricingRules';
import PaymentsReport from './pages/PaymentsReport';
import DocumentVerification from './pages/DocumentVerification';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";

const Sidebar = ({ className, onClose }) => {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Ерөнхий самбар', path: '/' },
    { icon: Calculator, label: 'Тарифын тохиргоо', path: '/pricing' },
    { icon: Users, label: 'Жолоочийн удирдлага', path: '/drivers' },
    { icon: Truck, label: 'Дуудлагын хүсэлтүүд', path: '/requests' },
    { icon: CreditCard, label: 'Төлбөрийн тайлан', path: '/payments' },
    { icon: FileCheck, label: 'Баримт бичиг шалгах', path: '/verification' },
  ];

  return (
    <div className={cn("flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border relative overflow-hidden", className)}>
      {/* Decorative gradient blob */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />
      
      <div className="h-20 flex items-center px-6 border-b border-sidebar-border/50 relative z-10">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/25">
                <span className="text-white font-bold text-xl">K</span>
            </div>
            <div className="flex flex-col">
                <h1 className="text-lg font-bold tracking-tight leading-none">KHAN MOTORS</h1>
                <span className="text-[10px] text-sidebar-foreground/60 font-medium tracking-wider uppercase mt-1">Admin Portal</span>
            </div>
        </div>
      </div>
      
      <div className="flex-1 py-6 px-4 space-y-6 overflow-y-auto relative z-10">
        <div className="space-y-1">
            <div className="px-2 mb-2 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
                Үндсэн цэс
            </div>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <div className="flex items-center gap-3 relative z-10">
                      <item.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive ? "text-primary-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground")} />
                      {item.label}
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
                </Link>
              );
            })}
        </div>
      </div>

      <div className="p-4 border-t border-sidebar-border/50 bg-sidebar-accent/20 relative z-10">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border/50 hover:bg-sidebar-accent cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarImage src={profile?.avatar_url || "/placeholder-user.jpg"} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {profile?.full_name?.substring(0,2).toUpperCase() || 'AD'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 min-w-0 text-left">
                        <span className="text-sm font-semibold truncate">{profile?.full_name || user?.email}</span>
                        <span className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</span>
                    </div>
                    <Settings className="h-4 w-4 text-sidebar-foreground/50" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" side="right" sideOffset={10}>
                <DropdownMenuLabel>Миний хаяг</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer w-full flex items-center" onClick={onClose}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Тохиргоо</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Гарах</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary/30">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-50 h-screen w-[280px] bg-sidebar transition-all duration-300 ease-in-out md:translate-x-0 border-r border-sidebar-border shadow-2xl md:shadow-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
        <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 md:hidden text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setSidebarOpen(false)}
        >
            <X className="h-5 w-5" />
        </Button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto bg-muted/30 relative">
        {/* Background gradient splash */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/5 to-transparent -z-10" />

        <header className="md:hidden h-16 flex items-center px-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-4 font-bold text-lg text-primary">XAN MOTORS</span>
        </header>

        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <Outlet />
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/" element={<DashboardOverview />} />
          <Route path="/drivers" element={<DriverManagement />} />
          <Route path="/requests" element={<TripManagement />} />
          <Route path="/pricing" element={<PricingRules />} />
          <Route path="/payments" element={<PaymentsReport />} />
          <Route path="/verification" element={<DocumentVerification />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
