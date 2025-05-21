
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ActivityLogs } from "@/components/activity/ActivityLogs";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ActivityLogsPage = () => {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/dashboard");
      }
    }
  }, [isAdmin, isAuthenticated, isLoading, navigate]);

  if (isLoading || !isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <DashboardLayout>
      <ActivityLogs />
    </DashboardLayout>
  );
};

export default ActivityLogsPage;
