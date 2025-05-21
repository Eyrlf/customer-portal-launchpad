
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SalesTable } from "@/components/sales/SalesTable";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SalesPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <SalesTable />
    </DashboardLayout>
  );
};

export default SalesPage;
