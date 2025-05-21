
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { NotificationList } from "@/components/notifications/NotificationList";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NotificationsPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <NotificationList />
    </DashboardLayout>
  );
};

export default NotificationsPage;
