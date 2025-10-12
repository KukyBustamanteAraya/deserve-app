type CompletionBarProps = {
  percentage: number;
  label?: string;
  showPercentage?: boolean;
};

export function CompletionBar({
  percentage,
  label,
  showPercentage = true
}: CompletionBarProps) {
  // Ensure percentage is between 0 and 100
  const validPercentage = Math.min(Math.max(percentage, 0), 100);

  // Color based on completion
  const getColor = () => {
    if (validPercentage === 100) return 'bg-green-500';
    if (validPercentage >= 75) return 'bg-blue-500';
    if (validPercentage >= 50) return 'bg-yellow-500';
    if (validPercentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showPercentage && (
            <span className="text-sm font-semibold text-gray-900">
              {validPercentage}%
            </span>
          )}
        </div>
      )}

      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ease-out ${getColor()}`}
          style={{ width: `${validPercentage}%` }}
        />
      </div>
    </div>
  );
}
