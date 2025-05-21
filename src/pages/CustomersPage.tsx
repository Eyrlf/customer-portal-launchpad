
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const CustomersPage = () => {
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
      <CustomersTable />
    </DashboardLayout>
  );
};

export default CustomersPage;
