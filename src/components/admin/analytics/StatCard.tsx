interface Props {
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'default' | 'green' | 'yellow' | 'red' | 'blue';
}

export default function StatCard({ label, value, subValue, color = 'default' }: Props) {
  const colorClasses = {
    default: 'text-gray-900',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    blue: 'text-blue-600'
  };

  const bgColorClasses = {
    default: 'bg-gray-50',
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    red: 'bg-red-50',
    blue: 'bg-blue-50'
  };

  return (
    <div className={`${bgColorClasses[color]} p-6 rounded-lg border`}>
      <h3 className="text-sm font-medium text-gray-500 mb-2">{label}</h3>
      <div className={`text-3xl font-bold ${colorClasses[color]}`}>
        {value}
      </div>
      {subValue && (
        <div className="text-sm text-gray-600 mt-1">
          {subValue}
        </div>
      )}
    </div>
  );
}