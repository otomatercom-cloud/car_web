"use client";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "./ui";
import type { Dashboard } from "@/lib/types";
import { money } from "@/lib/format";

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#64748b"];
const ax = { tick: { fontSize: 11, fill: "var(--muted)" }, tickLine: false, axisLine: false } as const;
const short = (d: string) => d.slice(5);

export default function DashboardCharts({ d }: { d: Dashboard }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><h3 className="mb-2 font-bold">Revenue trend</h3><div className="h-60"><ResponsiveContainer><LineChart data={d.revenue_trend}><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" /><XAxis dataKey="date" tickFormatter={short} {...ax} /><YAxis {...ax} width={48} /><Tooltip formatter={(v) => money(Number(v))} /><Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></Card>
      <Card><h3 className="mb-2 font-bold">Vehicles washed</h3><div className="h-60"><ResponsiveContainer><BarChart data={d.vehicle_trend}><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" /><XAxis dataKey="date" tickFormatter={short} {...ax} /><YAxis {...ax} width={32} allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
      <Card><h3 className="mb-2 font-bold">Average waiting time (min)</h3><div className="h-60"><ResponsiveContainer><LineChart data={d.wait_trend}><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" /><XAxis dataKey="date" tickFormatter={short} {...ax} /><YAxis {...ax} width={32} /><Tooltip /><Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></Card>
      <Card><h3 className="mb-2 font-bold">Bay utilization (%)</h3><div className="h-60"><ResponsiveContainer><BarChart data={d.bay_utilization} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" /><XAxis type="number" domain={[0, 100]} {...ax} /><YAxis type="category" dataKey="bay" {...ax} width={64} /><Tooltip /><Bar dataKey="utilization" fill="#8b5cf6" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div></Card>
      <Card><h3 className="mb-2 font-bold">Popular services</h3><div className="h-60"><ResponsiveContainer><BarChart data={d.service_popularity} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="var(--line)" /><XAxis type="number" {...ax} allowDecimals={false} /><YAxis type="category" dataKey="name" {...ax} width={96} /><Tooltip /><Bar dataKey="count" fill="#0ea5e9" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div></Card>
      <Card><h3 className="mb-2 font-bold">Vehicle types</h3><div className="h-60"><ResponsiveContainer><PieChart><Pie data={d.vehicle_types} dataKey="count" nameKey="name" innerRadius={50} outerRadius={85} label>{d.vehicle_types.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></Card>
    </div>
  );
}
