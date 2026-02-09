import React from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar"

export function RecentSales({ data = [] }) {
  // Take only first 5
  const recentTransactions = data.slice(0, 5);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('mn-MN', { style: 'currency', currency: 'MNT' }).format(amount);
  };

  const getInitials = (name) => {
      if (!name) return '??';
      const parts = name.split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.substring(0, 2).toUpperCase();
  };

  if (recentTransactions.length === 0) {
      return <div className="text-center text-muted-foreground">Гүйлгээ байхгүй байна.</div>;
  }

  return (
    <div className="space-y-8">
      {recentTransactions.map((tx, index) => (
        <div className="flex items-center" key={tx.id || tx._id || index}>
            <Avatar className="h-9 w-9">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${tx.driver}`} alt="Avatar" />
            <AvatarFallback>{getInitials(tx.driver)}</AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{tx.driver}</p>
            <p className="text-sm text-muted-foreground">
                {tx.email || 'N/A'}
            </p>
            </div>
            <div className={`ml-auto font-medium ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
            </div>
        </div>
      ))}
    </div>
  )
}
