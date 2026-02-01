import React from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const data = [
  {
    name: "1-р сар",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "2-р сар",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "3-р сар",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "4-р сар",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "5-р сар",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "6-р сар",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "7-р сар",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "8-р сар",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "9-р сар",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "10-р сар",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "11-р сар",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
  {
    name: "12-р сар",
    total: Math.floor(Math.random() * 5000) + 1000,
  },
]

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `₮${value}`}
        />
        <Tooltip 
            cursor={{fill: 'transparent'}}
            contentStyle={{ backgroundColor: 'oklch(var(--card))', borderRadius: 'var(--radius)', border: '1px solid oklch(var(--border))' }}
        />
        <Bar
          dataKey="total"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
          className="fill-primary"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
