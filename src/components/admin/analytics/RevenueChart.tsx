'use client';

import React from 'react';
import { logger } from '@/lib/logger';

interface RevenueData {
  day: string;
  totalCents: number;
}

interface Props {
  data: RevenueData[];
}

export default function RevenueChart({ data }: Props) {
  // Check if recharts is available
  const [RechartsComponents, setRechartsComponents] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadRecharts = async () => {
      try {
        const recharts = await import('recharts');
        setRechartsComponents({
          LineChart: recharts.LineChart,
          Line: recharts.Line,
          XAxis: recharts.XAxis,
          YAxis: recharts.YAxis,
          CartesianGrid: recharts.CartesianGrid,
          Tooltip: recharts.Tooltip,
          ResponsiveContainer: recharts.ResponsiveContainer,
        });
      } catch (error) {
        logger.debug('Recharts not available yet, showing placeholder');
      } finally {
        setLoading(false);
      }
    };

    loadRecharts();
  }, []);

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString('es-CL', { minimumFractionDigits: 0 })}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Last 7 Days</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!RechartsComponents) {
    // Fallback when recharts is not available
    return (
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Last 7 Days</h3>
        <div className="space-y-2">
          {data.map((item) => (
            <div key={item.day} className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">{formatDate(item.day)}</span>
              <span className="text-sm font-medium text-gray-900">{formatCurrency(item.totalCents)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            📊 Chart view will be available once recharts dependency is installed.
          </p>
        </div>
      </div>
    );
  }

  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = RechartsComponents;

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Last 7 Days</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="day"
              tickFormatter={formatDate}
              fontSize={12}
            />
            <YAxis
              tickFormatter={(value) => `$${(value / 100).toLocaleString()}`}
              fontSize={12}
            />
            <Tooltip
              labelFormatter={(label) => formatDate(label)}
              formatter={(value: number) => [formatCurrency(value), 'Revenue']}
            />
            <Line
              type="monotone"
              dataKey="totalCents"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}