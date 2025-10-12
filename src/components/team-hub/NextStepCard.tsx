import Link from 'next/link';
import { Card, CardHeader, CardContent } from './Card';
import type { TeamStats, RoleType } from '@/types/team-hub';

interface NextStepCardProps {
  stats: TeamStats;
  role: RoleType;
  teamSlug: string;
  onActionClick?: () => void;
}

export function NextStepCard({ stats, role, teamSlug, onActionClick }: NextStepCardProps) {
  // Determine next step based on current stage and role
  const getNextStep = () => {
    const isManager = role === 'owner' || role === 'sub_manager';

    switch (stats.current_stage) {
      case 'design':
        if (isManager) {
          return {
            title: '🎨 Approve Design',
            description: 'Review and approve the design mockups from our team',
            action: { label: 'View Designs', href: `/mi-equipo` },
            status: 'in_progress' as const,
          };
        } else {
          return {
            title: '⏳ Waiting for Design Approval',
            description: 'Your manager is reviewing the design mockups',
            status: 'pending' as const,
          };
        }

      case 'roster':
        const allSubmitted = stats.player_info_submitted === stats.player_info_total;
        if (isManager) {
          return {
            title: '👥 Collect Player Information',
            description: allSubmitted
              ? 'All player info collected! Ready to place order.'
              : `${stats.player_info_submitted} of ${stats.player_info_total} players have submitted their info`,
            action: { label: 'Manage Roster', href: `/mi-equipo` },
            status: allSubmitted ? 'complete' as const : 'in_progress' as const,
          };
        } else {
          return {
            title: '📝 Submit Your Information',
            description: 'Fill out your jersey details (name, number, size)',
            action: { label: 'Submit Info', href: `/mi-equipo` },
            status: 'in_progress' as const,
          };
        }

      case 'payment':
        if (isManager) {
          return {
            title: '💳 Collect Payments',
            description: 'Waiting for team members to complete their payments',
            action: { label: 'View Payments', href: `/mi-equipo` },
            status: 'in_progress' as const,
          };
        } else {
          return {
            title: '💳 Complete Payment',
            description: 'Pay for your jersey to finalize the order',
            action: { label: 'Pay Now', href: `/mi-equipo` },
            status: 'in_progress' as const,
          };
        }

      case 'production':
        return {
          title: '🏭 Order in Production',
          description: 'Your jerseys are being manufactured',
          action: { label: 'Track Order', href: `/mi-equipo` },
          status: 'in_progress' as const,
        };

      case 'shipping':
        return {
          title: '🚚 Order Shipped',
          description: stats.order_status === 'delivered'
            ? 'Your order has been delivered!'
            : 'Your order is on its way',
          action: { label: 'Track Package', href: `/mi-equipo` },
          status: stats.order_status === 'delivered' ? 'complete' as const : 'in_progress' as const,
        };

      default:
        return {
          title: '🚀 Get Started',
          description: 'Create a design request to begin your team order',
          status: 'pending' as const,
        };
    }
  };

  const nextStep = getNextStep();

  const statusColors = {
    pending: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    complete: 'bg-green-100 text-green-800',
    blocked: 'bg-red-100 text-red-800',
  };

  const statusIcons = {
    pending: '⏸️',
    in_progress: '▶️',
    complete: '✅',
    blocked: '🚫',
  };

  return (
    <Card>
      <CardHeader
        icon="🎯"
        title="Next Step"
        subtitle="What you need to do next"
      />
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[nextStep.status]}`}>
              {statusIcons[nextStep.status]} {nextStep.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {nextStep.title}
            </h3>
            <p className="text-gray-600 mb-4">
              {nextStep.description}
            </p>
          </div>

          {nextStep.action && (
            onActionClick ? (
              <button
                onClick={onActionClick}
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                {nextStep.action.label}
              </button>
            ) : (
              <Link
                href={nextStep.action.href!}
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                {nextStep.action.label}
              </Link>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
