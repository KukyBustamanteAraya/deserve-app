interface Props {
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'default' | 'green' | 'yellow' | 'red' | 'blue';
}

export default function StatCard({ label, value, subValue, color = 'default' }: Props) {
  const colorClasses = {
    default: 'text-white',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    blue: 'text-[#e21c21]'
  };

  const borderColorClasses = {
    default: 'border-gray-700',
    green: 'border-green-500/30',
    yellow: 'border-yellow-500/30',
    red: 'border-red-500/30',
    blue: 'border-[#e21c21]/30'
  };

  return (
    <div className={`relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border ${borderColorClasses[color]} rounded-lg shadow-2xl p-6 overflow-hidden group`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <h3 className="text-sm font-medium text-gray-400 mb-2 relative">{label}</h3>
      <div className={`text-3xl font-bold ${colorClasses[color]} relative`}>
        {value}
      </div>
      {subValue && (
        <div className="text-sm text-gray-500 mt-1 relative">
          {subValue}
        </div>
      )}
    </div>
  );
}