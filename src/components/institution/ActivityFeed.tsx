'use client';

import { useRouter } from 'next/navigation';
import type { InstitutionActivity } from '@/lib/mockData/institutionData';

interface ActivityFeedProps {
  activities: InstitutionActivity[];
  institutionSlug: string;
}

export function ActivityFeed({ activities, institutionSlug }: ActivityFeedProps) {
  const router = useRouter();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return 'O';
      case 'approval':
        return 'A';
      case 'roster':
        return 'R';
      case 'payment':
        return 'P';
      default:
        return 'I';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'border-blue-500/50 bg-blue-500/10';
      case 'approval':
        return 'border-yellow-500/50 bg-yellow-500/10';
      case 'roster':
        return 'border-green-500/50 bg-green-500/10';
      case 'payment':
        return 'border-purple-500/50 bg-purple-500/10';
      default:
        return 'border-gray-600/50 bg-gray-700/10';
    }
  };

  // Check if showing only the initial creation activity
  const isInitialActivity = activities.length === 1 && activities[0].id === 'initial-creation';

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="relative p-4">
        <h2 className="text-lg font-bold text-white mb-4">
          Actividad Reciente
        </h2>

        <div className="space-y-2">
          {activities.map((activity) => {
            // Don't make the initial creation activity clickable
            const isCreationActivity = activity.id === 'initial-creation';
            const Element = isCreationActivity ? 'div' : 'button';

            return (
              <Element
                key={activity.id}
                {...(!isCreationActivity && {
                  onClick: () => {
                    if (activity.teamSlug) {
                      router.push(`/mi-equipo/${activity.teamSlug}`);
                    }
                  }
                })}
                className={`relative w-full bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-2.5 border border-gray-700 ${
                  isCreationActivity ? '' : 'hover:border-gray-600 cursor-pointer'
                } transition-all overflow-hidden group/item text-left`}
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none"></div>

              <div className="relative flex items-center gap-2.5">
                {/* Activity Icon */}
                <div className={`flex-shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center ${getActivityColor(activity.type)}`}>
                  <span className="text-xs font-bold">{getActivityIcon(activity.type)}</span>
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium">
                    {activity.action}
                  </p>
                </div>

                {/* Timestamp */}
                <div className="flex-shrink-0">
                  <p className="text-gray-400 text-xs">{activity.timestamp}</p>
                </div>

                {/* Arrow - Only show for clickable items */}
                {!isCreationActivity && (
                  <div className="flex-shrink-0 text-gray-500 group-hover/item:text-gray-300 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            </Element>
            );
          })}
        </div>

        {/* View All Button - Only show if there's real activity */}
        {!isInitialActivity && (
          <button
            onClick={() => {
              router.push(`/mi-equipo/${institutionSlug}/communications`);
            }}
            className="relative w-full mt-3 px-3 py-2 bg-gradient-to-br from-gray-800/30 via-black/20 to-gray-900/30 text-gray-300 hover:text-white border border-gray-700 hover:border-[#e21c21]/50 rounded-lg text-sm font-medium overflow-hidden group/view transition-all"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/view:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative flex items-center justify-center gap-2">
              <span>Ver Toda la Actividad</span>
              <span>→</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
