
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  details: any;
  created_at: string;
  user_email?: string;
}

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 10;
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    try {
      const { data, error, count } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      
      if (error) throw error;
      
      // Fetch user emails for each log
      const logsWithUserInfo = await Promise.all(
        (data || []).map(async (log) => {
          if (!log.user_id) return { ...log, user_email: 'System' };
          
          try {
            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
              log.user_id
            );
            
            return {
              ...log,
              user_email: userData?.user?.email || 'Unknown',
            };
          } catch (e) {
            return { ...log, user_email: 'Unknown' };
          }
        })
      );
      
      setLogs(logsWithUserInfo);
      setHasMore(count !== null ? page * pageSize < count : false);
      
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch activity logs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPp');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatActionBadge = (action: string) => {
    const badgeClasses = {
      insert: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      restore: 'bg-purple-100 text-purple-800',
      default: 'bg-gray-100 text-gray-800'
    };
    
    const badgeClass = badgeClasses[action as keyof typeof badgeClasses] || badgeClasses.default;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${badgeClass}`}>
        {action}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Activity Logs</h2>
      
      <Table>
        <TableCaption>{loading ? 'Loading activity logs...' : 'Activity logs showing user actions.'}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Table</TableHead>
            <TableHead>Record ID</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">No activity logs found.</TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{formatDate(log.created_at)}</TableCell>
                <TableCell>{log.user_email}</TableCell>
                <TableCell>{formatActionBadge(log.action)}</TableCell>
                <TableCell>{log.table_name}</TableCell>
                <TableCell className="font-mono text-xs">{log.record_id}</TableCell>
                <TableCell>
                  {log.details ? (
                    <pre className="text-xs overflow-auto max-w-md">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  ) : (
                    'No details'
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      <div className="mt-4 flex justify-between">
        <Button 
          variant="outline" 
          disabled={page === 1} 
          onClick={() => setPage(p => Math.max(p - 1, 1))}
        >
          Previous
        </Button>
        <span className="py-2">Page {page}</span>
        <Button 
          variant="outline" 
          disabled={!hasMore} 
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
