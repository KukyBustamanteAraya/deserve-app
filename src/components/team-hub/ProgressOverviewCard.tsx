import { Card, CardHeader, CardContent } from './Card';
import { ProgressBar } from './ProgressBar';
import type { TeamStats } from '@/types/team-hub';

interface ProgressOverviewCardProps {
  stats: TeamStats;
}

export function ProgressOverviewCard({ stats }: ProgressOverviewCardProps) {
  const paymentPercentage = stats.payment_total_cents > 0
    ? Math.round((stats.payment_received_cents / stats.payment_total_cents) * 100)
    : 0;

  return (
    <Card>
      <CardHeader
        icon="📊"
        title="Team Progress"
        subtitle="Track your team's progress through the ordering process"
      />
      <CardContent className="space-y-6">
        {/* Player Info Progress */}
        <div>
          <ProgressBar
            current={stats.player_info_submitted}
            total={stats.player_info_total}
            label="Player Information Collected"
            color={stats.player_info_submitted === stats.player_info_total ? 'green' : 'blue'}
          />
        </div>

        {/* Payment Progress */}
        {stats.payment_total_cents > 0 && (
          <div>
            <ProgressBar
              current={stats.payment_received_cents}
              total={stats.payment_total_cents}
              label="Payments Received"
              color={paymentPercentage === 100 ? 'green' : paymentPercentage > 50 ? 'yellow' : 'blue'}
            />
            <p className="text-sm text-gray-600 mt-2">
              ${(stats.payment_received_cents / 100).toFixed(2)} of ${(stats.payment_total_cents / 100).toFixed(2)}
            </p>
          </div>
        )}

        {/* Current Stage Indicator */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Current Stage</h4>
          <div className="flex items-center gap-2">
            {['design', 'roster', 'payment', 'production', 'shipping'].map((stage, index) => {
              const isCurrent = stage === stats.current_stage;
              const isPast = ['design', 'roster', 'payment', 'production', 'shipping'].indexOf(stats.current_stage) >
                            ['design', 'roster', 'payment', 'production', 'shipping'].indexOf(stage);

              return (
                <div key={stage} className="flex-1">
                  <div className={`
                    h-2 rounded-full transition-colors
                    ${isCurrent ? 'bg-blue-600' : isPast ? 'bg-green-600' : 'bg-gray-200'}
                  `} />
                  <p className={`
                    text-xs mt-1 text-center capitalize
                    ${isCurrent ? 'text-blue-600 font-semibold' : isPast ? 'text-green-600' : 'text-gray-500'}
                  `}>
                    {stage}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
