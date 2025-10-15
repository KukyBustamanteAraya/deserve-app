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
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl p-6 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <h3 className="text-lg font-semibold text-white mb-4 relative">Revenue Last 7 Days</h3>
        <div className="h-64 flex items-center justify-center relative">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e21c21]"></div>
        </div>
      </div>
    );
  }

  if (!RechartsComponents) {
    // Fallback when recharts is not available
    return (
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl p-6 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <h3 className="text-lg font-semibold text-white mb-4 relative">Revenue Last 7 Days</h3>
        <div className="space-y-2 relative">
          {data.map((item) => (
            <div key={item.day} className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-sm text-gray-400">{formatDate(item.day)}</span>
              <span className="text-sm font-medium text-white">{formatCurrency(item.totalCents)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md relative">
          <p className="text-sm text-yellow-400">
            📊 Chart view will be available once recharts dependency is installed.
          </p>
        </div>
      </div>
    );
  }

  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = RechartsComponents;

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl p-6 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <h3 className="text-lg font-semibold text-white mb-4 relative">Revenue Last 7 Days</h3>
      <div className="h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="day"
              tickFormatter={formatDate}
              fontSize={12}
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis
              tickFormatter={(value) => `$${(value / 100).toLocaleString()}`}
              fontSize={12}
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <Tooltip
              labelFormatter={(label) => formatDate(label)}
              formatter={(value: number) => [formatCurrency(value), 'Revenue']}
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid rgba(75, 85, 99, 0.5)',
                borderRadius: '0.5rem',
                color: '#ffffff'
              }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Line
              type="monotone"
              dataKey="totalCents"
              stroke="#e21c21"
              strokeWidth={2}
              dot={{ fill: '#e21c21', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#e21c21', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}