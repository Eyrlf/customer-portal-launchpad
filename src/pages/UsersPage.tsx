
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UsersTable } from "@/components/users/UsersTable";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const UsersPage = () => {
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
      <UsersTable />
    </DashboardLayout>
  );
};

export default UsersPage;
