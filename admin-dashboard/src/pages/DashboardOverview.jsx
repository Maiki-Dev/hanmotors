import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Users, CreditCard, Activity, Truck, Calendar } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Overview } from "../components/overview";
import { RecentSales } from "../components/recent-sales";
import api from '../services/api';

const DashboardOverview = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState({
    activeDrivers: 0,
    onlineDrivers: 0,
    todayRequests: 0,
    totalRevenue: 0
  });
  const [revenueData, setRevenueData] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin/stats');
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch stats", error);
      }
    };
    
    const fetchRevenue = async () => {
      try {
        const response = await api.get('/admin/revenue-chart');
        setRevenueData(response.data);
      } catch (error) {
        console.error("Failed to fetch revenue", error);
      }
    };

    const fetchTransactions = async () => {
      try {
        const response = await api.get('/admin/transactions');
        setTransactions(response.data.transactions);
      } catch (error) {
        console.error("Failed to fetch transactions", error);
      }
    };

    fetchStats();
    fetchRevenue();
    fetchTransactions();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
        fetchStats();
        fetchRevenue();
        fetchTransactions();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Formatter for currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('mn-MN', { style: 'currency', currency: 'MNT' }).format(amount);
  };

  const stats = [
    {
      title: "Нийт орлого",
      value: formatCurrency(data.totalRevenue),
      description: "Нийт орлого",
      icon: CreditCard,
    },
    {
      title: "Бүртгэлтэй жолооч",
      value: `+${data.activeDrivers}`,
      description: "Нийт жолооч нар",
      icon: Users,
    },
    {
      title: "Өнөөдрийн дуудлага",
      value: `+${data.todayRequests}`,
      description: "Өнөөдөр ирсэн",
      icon: Truck,
    },
    {
      title: "Идэвхтэй одоо",
      value: `+${data.onlineDrivers}`,
      description: "Онлайн байгаа жолооч",
      icon: Activity,
    },
  ];

  return (
    <div className="flex-1 space-y-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-primary">Ерөнхий самбар</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="hidden md:flex">
             <Calendar className="mr-2 h-4 w-4" />
             Jan 20, 2024 - Feb 09, 2024
          </Button>
          <Button>Тайлан татах</Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger 
            isActive={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')}
          >
            Ерөнхий
          </TabsTrigger>
          <TabsTrigger 
            isActive={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')}
            disabled
          >
            Аналитик
          </TabsTrigger>
          <TabsTrigger 
            isActive={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')}
            disabled
          >
            Тайлан
          </TabsTrigger>
          <TabsTrigger 
            isActive={activeTab === 'notifications'} 
            onClick={() => setActiveTab('notifications')}
            disabled
          >
            Мэдэгдэл
          </TabsTrigger>
        </TabsList>

        <TabsContent isActive={activeTab === 'overview'} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
               <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Орлогын тойм</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview data={revenueData} />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Сүүлийн гүйлгээнүүд</CardTitle>
                <CardDescription>
                  Энэ сард хийгдсэн нийт гүйлгээнүүд
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentSales data={transactions} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardOverview;
