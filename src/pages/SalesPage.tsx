
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SalesTable } from "@/components/sales/SalesTable";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SaleForm } from "@/components/sales/SaleForm";
import { supabase } from "@/integrations/supabase/client";

const SalesPage = () => {
  const { isAuthenticated, isLoading, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (user && !isAdmin) {
      fetchUserPermissions();
    } else if (isAdmin) {
      // Admins have all permissions
      setUserPermissions({
        can_add_sales: true,
      });
    }

    // Fetch customers for the form
    fetchCustomers();
  }, [isAdmin, user]);

  const fetchUserPermissions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) {
        if (error.code !== "PGRST116") {
          console.error('Error fetching user permissions:', error);
        }
        // Default to no permissions if none are set
        setUserPermissions({
          can_add_sales: false,
        });
        return;
      }
      
      if (data) {
        setUserPermissions(data);
      }
    } catch (error) {
      console.error('Error in fetchUserPermissions:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer')
        .select('custno, custname, address, payterm')
        .is('deleted_at', null);
      
      if (error) {
        console.error('Error fetching customers:', error);
        return;
      }
      
      // Format customers for the form
      const formattedCustomers = data.map(customer => ({
        custno: customer.custno,
        custname: customer.custname,
        address: customer.address || null,
        city: null,
        phone: null,
        payterm: customer.payterm || null
      }));
      
      setCustomers(formattedCustomers);
    } catch (error) {
      console.error('Error in fetchCustomers:', error);
    }
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
  };

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

  const canAddSale = isAdmin || (userPermissions?.can_add_sales || false);

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-80px)]">
        <div className="p-6">
          <div className="mb-6 flex flex-col space-y-4 lg:flex-row lg:space-y-0 lg:items-center lg:justify-between">
            <h1 className="text-3xl font-bold">Sales</h1>
            <div className="flex items-center space-x-4">
              {canAddSale && (
                <Button onClick={() => setDialogOpen(true)} className="bg-blue-500 hover:bg-blue-600">
                  <Plus size={20} className="mr-2" /> Add Sale
                </Button>
              )}
            </div>
          </div>
          
          <div className="mb-4 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input 
                  placeholder="Search transactions..." 
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Select 
              value={statusFilter} 
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="added">Added</SelectItem>
                <SelectItem value="edited">Edited</SelectItem>
                <SelectItem value="restored">Restored</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={sortOrder} 
              onValueChange={(value: "asc" | "desc") => setSortOrder(value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Transaction No (A-Z)</SelectItem>
                <SelectItem value="desc">Transaction No (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <SalesTable statusFilter={statusFilter} searchQuery={searchQuery} sortOrder={sortOrder} />
        </div>
      </ScrollArea>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add New Sale</DialogTitle>
            <DialogDescription>
              Create a new sales transaction. Add customer and product information below.
            </DialogDescription>
          </DialogHeader>
          
          <SaleForm
            selectedSale={null}
            isEditing={false}
            customers={customers}
            onSubmitSuccess={handleFormSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SalesPage;
