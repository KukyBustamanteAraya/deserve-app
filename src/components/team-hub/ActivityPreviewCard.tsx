import Link from 'next/link';
import { Card, CardHeader, CardContent } from './Card';
import { getRoleDisplayName, getRoleBadgeColor } from '@/lib/permissions';
import type { ActivityLogEntry } from '@/types/team-hub';

interface ActivityPreviewCardProps {
  activities: ActivityLogEntry[];
  teamSlug: string;
}

export function ActivityPreviewCard({ activities, teamSlug }: ActivityPreviewCardProps) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getActionIcon = (actionType: ActivityLogEntry['action_type']) => {
    const icons: Record<ActivityLogEntry['action_type'], string> = {
      design_created: '🎨',
      design_approved: '✅',
      design_rejected: '❌',
      vote_cast: '🗳️',
      player_info_submitted: '📝',
      player_info_edited: '✏️',
      order_created: '📦',
      order_status_updated: '🚚',
      payment_received: '💳',
      member_invited: '✉️',
      member_joined: '👋',
      role_changed: '👤',
      admin_assist: '🛡️',
      settings_updated: '⚙️',
    };
    return icons[actionType] || '📋';
  };

  return (
    <Card>
      <CardHeader
        icon="📋"
        title="Recent Activity"
        subtitle="Latest updates from your team"
        action={
          <Link
            href={`/teams/${teamSlug}/activity`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All →
          </Link>
        }
      />
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 pb-4 border-b last:border-b-0 last:pb-0"
              >
                {/* Icon */}
                <div className="text-2xl flex-shrink-0">
                  {getActionIcon(activity.action_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {activity.action_description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {activity.user_role && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getRoleBadgeColor(activity.user_role)}`}>
                        {getRoleDisplayName(activity.user_role)}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(activity.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
