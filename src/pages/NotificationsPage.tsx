
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { NotificationList } from "@/components/notifications/NotificationList";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NotificationsPage = () => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/dashboard"); // Redirect non-admin users
      }
    }
  }, [isAuthenticated, isLoading, isAdmin, navigate]);

  // Only render for admin users who are authenticated
  if (isLoading || !isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <DashboardLayout>
      <NotificationList />
    </DashboardLayout>
  );
};

export default NotificationsPage;
