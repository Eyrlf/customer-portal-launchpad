
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateByUserPreference } from "@/utils/dateFormatter";
import { User, FileEdit, Trash, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityItem {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  user_name?: string;
  created_at: string;
  details: any;
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentActivity() {
      try {
        // Fetch most recent 5 activities
        const { data: activityData, error: activityError } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (activityError) throw activityError;

        // Fetch user profiles for each activity
        const activitiesWithUsers = await Promise.all(
          (activityData || []).map(async (activity) => {
            if (!activity.user_id) return { ...activity, user_name: 'System' };

            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', activity.user_id)
                .single();

              const userName = profileData?.first_name && profileData?.last_name
                ? `${profileData.first_name} ${profileData.last_name}`.trim()
                : profileData?.email || 'Unknown User';

              return { ...activity, user_name: userName };
            } catch (e) {
              return { ...activity, user_name: 'Unknown User' };
            }
          })
        );

        setActivities(activitiesWithUsers);
      } catch (error) {
        console.error('Error fetching activity data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentActivity();
  }, []);

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'insert':
        return <User className="h-4 w-4 text-green-500" />;
      case 'update':
        return <FileEdit className="h-4 w-4 text-blue-500" />;
      case 'delete':
        return <Trash className="h-4 w-4 text-red-500" />;
      case 'restore':
        return <RefreshCw className="h-4 w-4 text-purple-500" />;
      default:
        return <FileEdit className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTableDisplayName = (tableName: string) => {
    // Convert snake_case to Title Case with spaces
    return tableName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getFormattedAction = (action: string) => {
    switch (action.toLowerCase()) {
      case 'insert':
        return 'inserted';
      case 'update':
        return 'updated';
      case 'delete':
        return 'deleted';
      case 'restore':
        return 'restored';
      default:
        return action;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <p className="text-center text-gray-500 py-4">No recent activity found</p>
      ) : (
        activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-4 p-3 rounded-md hover:bg-gray-50 transition-colors">
            <div className="mt-1">{getActionIcon(activity.action)}</div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                <span className="text-blue-600">{activity.user_name}</span>
                {' '}
                {getFormattedAction(activity.action)} a {getTableDisplayName(activity.table_name).toLowerCase()} record
                {activity.details?.name && <span> - {activity.details.name}</span>}
              </p>
              <p className="text-xs text-gray-500">
                {formatDateByUserPreference(activity.created_at)}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
