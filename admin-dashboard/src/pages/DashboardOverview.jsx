import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Users, CreditCard, Activity, Truck, Calendar } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Overview } from "../components/overview";
import { RecentSales } from "../components/recent-sales";
import api from '../services/api';
import * as XLSX from 'xlsx';

const DashboardOverview = () => {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Date State (Default: Current Month)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(startOfMonth);
  const [endDate, setEndDate] = useState(today);

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
        const response = await api.get(`/admin/stats?startDate=${startDate}&endDate=${endDate}`);
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch stats", error);
      }
    };
    
    const fetchRevenue = async () => {
      try {
        // Revenue chart usually shows annual trends, but we could filter if needed. 
        // For now keeping it default annual view as per backend implementation.
        const response = await api.get('/admin/revenue-chart');
        setRevenueData(response.data);
      } catch (error) {
        console.error("Failed to fetch revenue", error);
      }
    };

    const fetchTransactions = async () => {
      try {
        const response = await api.get(`/admin/transactions?startDate=${startDate}&endDate=${endDate}`);
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
  }, [startDate, endDate]); // Re-fetch when dates change

  // Excel Export Handler
  const handleDownloadReport = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // 1. Summary Sheet
      const summaryData = [
        ["Тайлангийн хугацаа", `${startDate} - ${endDate}`],
        ["Нийт орлого", data.totalRevenue],
        ["Бүртгэлтэй жолооч (Нийт)", data.activeDrivers],
        ["Өнөөдрийн дуудлага", data.todayRequests],
        ["Онлайн жолооч", data.onlineDrivers],
        ["Гүйлгээний тоо", transactions.length]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Ерөнхий");

      // 2. Transactions Sheet
      if (transactions.length > 0) {
        const txData = transactions.map(t => ({
          "Огноо": new Date(t.date).toLocaleString(),
          "Жолооч": t.driver,
          "Имэйл": t.email,
          "Төрөл": t.type === 'credit' ? 'Орлого (Цэнэглэлт)' : 'Зарлага (Шимтгэл)',
          "Дүн": t.amount,
          "Тайлбар": t.description,
          "Төлөв": t.status
        }));
        const wsTx = XLSX.utils.json_to_sheet(txData);
        XLSX.utils.book_append_sheet(wb, wsTx, "Гүйлгээнүүд");
      }

      // Save file
      XLSX.writeFile(wb, `HanMotors_Report_${startDate}_${endDate}.xlsx`);
    } catch (error) {
      console.error("Export failed", error);
      alert("Тайлан татахад алдаа гарлаа.");
    }
  };

  // Formatter for currency
  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString() + '₮';
  };

  const stats = [
    {
      title: "Нийт орлого",
      value: formatCurrency(data.totalRevenue),
      description: "Сонгосон хугацааны орлого",
      icon: CreditCard,
    },
    {
      title: "Бүртгэлтэй жолооч",
      value: `+${data.activeDrivers}`,
      description: "Нийт идэвхтэй жолооч",
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
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight text-primary">Ерөнхий самбар</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="flex items-center space-x-2">
             <Input 
               type="date" 
               value={startDate} 
               onChange={(e) => setStartDate(e.target.value)} 
               className="w-[140px]"
             />
             <span className="text-muted-foreground">-</span>
             <Input 
               type="date" 
               value={endDate} 
               onChange={(e) => setEndDate(e.target.value)} 
               className="w-[140px]"
             />
          </div>
          <Button onClick={handleDownloadReport}>
            Тайлан татах
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
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
                  <div className="text-2xl font-bold break-words">{stat.value}</div>
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
      </div>
    </div>
  );
};

export default DashboardOverview;
