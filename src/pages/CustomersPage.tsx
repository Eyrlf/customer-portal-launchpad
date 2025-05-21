
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { CustomerGrid } from "@/components/customers/CustomerGrid";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, TableProperties } from "lucide-react";

const CustomersPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

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
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Customers</h1>
          <div className="flex items-center gap-4">
            <Tabs 
              value={viewMode} 
              onValueChange={(value: "table" | "grid") => setViewMode(value)}
              className="border rounded-md"
            >
              <TabsList>
                <TabsTrigger value="grid" className="flex items-center gap-1">
                  <LayoutGrid size={16} />
                  Grid
                </TabsTrigger>
                <TabsTrigger value="table" className="flex items-center gap-1">
                  <TableProperties size={16} />
                  Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        {viewMode === "table" ? (
          <CustomersTable sortOrder={sortOrder} />
        ) : (
          <CustomersTable sortOrder={sortOrder} viewMode="grid" />
        )}
      </div>
    </DashboardLayout>
  );
};

export default CustomersPage;
