type CompletionBarProps = {
  percentage: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
};

export function CompletionBar({
  percentage,
  label,
  showPercentage = true,
  color = '#e21c21'
}: CompletionBarProps) {
  // Ensure percentage is between 0 and 100
  const validPercentage = Math.min(Math.max(percentage, 0), 100);

  // If custom color provided, use it. Otherwise use completion-based colors
  const getBarStyle = () => {
    if (color) {
      return {
        backgroundColor: color,
        width: `${validPercentage}%`
      };
    }

    // Fallback to completion-based colors if no custom color
    let bgColor = '#ef4444'; // red-500
    if (validPercentage === 100) bgColor = '#22c55e'; // green-500
    else if (validPercentage >= 75) bgColor = '#3b82f6'; // blue-500
    else if (validPercentage >= 50) bgColor = '#eab308'; // yellow-500
    else if (validPercentage >= 25) bgColor = '#f97316'; // orange-500

    return {
      backgroundColor: bgColor,
      width: `${validPercentage}%`
    };
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-semibold text-gray-300">{label}</span>
          {showPercentage && (
            <span className="text-base font-bold text-white">
              {validPercentage}%
            </span>
          )}
        </div>
      )}

      <div className="w-full bg-gray-700/50 rounded-full h-4 overflow-hidden border border-gray-700">
        <div
          className="h-full transition-all duration-700 ease-out rounded-full shadow-lg"
          style={getBarStyle()}
        />
      </div>
    </div>
  );
}
