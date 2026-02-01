import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Download, CreditCard, Wallet, Loader2 } from 'lucide-react';
import api from '../services/api';

const PaymentsReport = () => {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalWalletDeposits: 0,
    totalWalletDebits: 0,
    totalCurrentBalance: 0,
    transactionCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/admin/transactions');
      setTransactions(response.data.transactions);
      setStats(response.data.stats);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-600">Амжилттай</Badge>;
      case 'processing': return <Badge className="bg-yellow-600">Боловсруулж байна</Badge>;
      case 'failed': return <Badge variant="destructive">Амжилтгүй</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString() + '₮';
  };

  const getTypeLabel = (type) => {
    return type === 'credit' ? 'Орлого (Цэнэглэлт)' : 'Зарлага';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight text-primary">Төлбөрийн тайлан</h2>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" /> Тайлан татах
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Нийт орлого (Аялал)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Бүх дууссан аялалын дүн</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Нийт данс цэнэглэлт</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalWalletDeposits)}</div>
            <p className="text-xs text-muted-foreground">Жолооч нарын хэтэвч</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Гүйлгээний тоо</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.transactionCount}</div>
            <p className="text-xs text-muted-foreground">Нийт хийгдсэн гүйлгээ</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Гүйлгээний түүх</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Жолооч</TableHead>
                <TableHead>Төрөл</TableHead>
                <TableHead>Тайлбар</TableHead>
                <TableHead>Огноо</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead className="text-right">Дүн</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((trx) => (
                  <TableRow key={trx.id || Math.random()}>
                    <TableCell className="font-medium">{trx.id?.substring(0, 8)}...</TableCell>
                    <TableCell>{trx.driver}</TableCell>
                    <TableCell>{getTypeLabel(trx.type)}</TableCell>
                    <TableCell>{trx.description}</TableCell>
                    <TableCell>{new Date(trx.date).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(trx.status)}</TableCell>
                    <TableCell className="text-right font-bold">
                       <span className={trx.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                         {trx.type === 'credit' ? '+' : '-'}{formatCurrency(trx.amount)}
                       </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                    Гүйлгээ олдсонгүй
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsReport;
