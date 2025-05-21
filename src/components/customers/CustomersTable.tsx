
import { useState, useEffect } from "react";
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserPermission } from "../sales/types";
import { supabase } from "@/integrations/supabase/client";
import { 
  Customer, 
  fetchCustomers, 
  fetchDeletedCustomers, 
  generateNewCustomerNumber,
  createCustomer, 
  updateCustomer,
  deleteCustomer,
  restoreCustomer,
  getCustomerStatus
} from "./CustomerService";
import { CustomerTableRow } from "./CustomerTableRow";
import { CustomerDialog } from "./CustomerDialog";
import { CustomerFormValues } from "./CustomerForm";

export function CustomersTable() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deletedCustomers, setDeletedCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState<UserPermission | null>(null);
  const [formDefaults, setFormDefaults] = useState<CustomerFormValues>({
    custno: "",
    custname: "",
    address: "",
    payterm: "COD",
  });
  
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();

  useEffect(() => {
    loadCustomersData();
    if (user && !isAdmin) {
      fetchUserPermissions();
    } else if (isAdmin) {
      // Admins have all permissions
      setUserPermissions({
        id: "",
        user_id: user?.id || "",
        can_add_customers: true,
        can_edit_customers: true,
        can_delete_customers: true,
        can_add_sales: true,
        can_edit_sales: true,
        can_delete_sales: true,
        created_at: "",
        updated_at: ""
      });
    }
  }, [showDeleted, isAdmin, user]);

  const loadCustomersData = async () => {
    setLoading(true);
    try {
      // Fetch active customers
      const activeCustomers = await fetchCustomers();
      setCustomers(activeCustomers);
      
      // Fetch deleted customers if showing deleted
      if (showDeleted && isAdmin) {
        const deletedCustomers = await fetchDeletedCustomers();
        setDeletedCustomers(deletedCustomers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
          // PGRST116 means no rows returned
          console.error('Error fetching user permissions:', error);
        }
        // Default to no permissions if none are set
        setUserPermissions({
          id: "",
          user_id: user.id,
          can_add_customers: false,
          can_edit_customers: false,
          can_delete_customers: false,
          can_add_sales: false,
          can_edit_sales: false,
          can_delete_sales: false,
          created_at: "",
          updated_at: ""
        });
        return;
      }
      
      if (data) {
        setUserPermissions(data as UserPermission);
      }
    } catch (error) {
      console.error('Error in fetchUserPermissions:', error);
    }
  };

  const prepareNewCustomerForm = async () => {
    if (!userPermissions?.can_add_customers && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to add customers.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const newCustNo = await generateNewCustomerNumber();
      setFormDefaults({
        custno: newCustNo,
        custname: "",
        address: "",
        payterm: "COD",
      });
      setIsEditing(false);
      setSelectedCustomer(null);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error generating customer number:', error);
      toast({
        title: "Error",
        description: "Failed to prepare new customer form.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    if (!userPermissions?.can_edit_customers && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit customers.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedCustomer(customer);
    setIsEditing(true);
    setFormDefaults({
      custno: customer.custno,
      custname: customer.custname || "",
      address: customer.address || "",
      payterm: customer.payterm || "COD",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (!userPermissions?.can_delete_customers && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete customers.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await deleteCustomer(customer);
      
      toast({
        title: "Customer Deleted",
        description: `Customer ${customer.custname} has been deleted.`,
      });
      
      loadCustomersData();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Error",
        description: "Failed to delete customer.",
        variant: "destructive",
      });
    }
  };

  const handleRestore = async (customer: Customer) => {
    if (!isAdmin) {
      toast({
        title: "Permission Denied",
        description: "Only administrators can restore deleted customers.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await restoreCustomer(customer);
      
      toast({
        title: "Customer Restored",
        description: `Customer ${customer.custname} has been restored.`,
      });
      
      loadCustomersData();
    } catch (error) {
      console.error('Error restoring customer:', error);
      toast({
        title: "Error",
        description: "Failed to restore customer.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (values: CustomerFormValues) => {
    try {
      if (isEditing && selectedCustomer) {
        if (!userPermissions?.can_edit_customers && !isAdmin) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to edit customers.",
            variant: "destructive",
          });
          return;
        }
        
        // Update existing customer
        await updateCustomer(selectedCustomer.custno, {
          custname: values.custname,
          address: values.address,
          payterm: values.payterm,
        });
        
        toast({
          title: "Customer Updated",
          description: `Customer ${values.custname} has been updated successfully.`,
        });
      } else {
        if (!userPermissions?.can_add_customers && !isAdmin) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to add customers.",
            variant: "destructive",
          });
          return;
        }
        
        // Create new customer
        await createCustomer(values);
        
        toast({
          title: "Customer Created",
          description: `Customer ${values.custname} has been created successfully.`,
        });
      }
      
      setDialogOpen(false);
      loadCustomersData();
    } catch (error: any) {
      console.error('Error submitting customer:', error);
      
      if (error.code === '23505') {
        toast({
          title: "Error",
          description: "Customer number already exists.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to save customer data.",
        variant: "destructive",
      });
    }
  };

  const canAddCustomer = isAdmin || (userPermissions?.can_add_customers || false);
  const canEditCustomer = isAdmin || (userPermissions?.can_edit_customers || false);
  const canDeleteCustomer = isAdmin || (userPermissions?.can_delete_customers || false);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Customers</h2>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => setShowDeleted(!showDeleted)}
            >
              {showDeleted ? "Hide Deleted" : "Show Deleted"}
            </Button>
          )}
          {canAddCustomer && (
            <Button onClick={prepareNewCustomerForm}>
              <Plus size={16} className="mr-2" /> Add Customer
            </Button>
          )}
        </div>
      </div>
      
      <Table>
        <TableCaption>{loading ? 'Loading customers...' : 'List of customers.'}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Customer No</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Payment Term</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!showDeleted && customers.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">No customers found.</TableCell>
            </TableRow>
          ) : showDeleted && deletedCustomers.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">No deleted customers found.</TableCell>
            </TableRow>
          ) : (
            (showDeleted ? deletedCustomers : customers).map((customer) => (
              <CustomerTableRow 
                key={customer.custno}
                customer={customer}
                showDeleted={showDeleted}
                isAdmin={isAdmin}
                canEditCustomer={canEditCustomer}
                canDeleteCustomer={canDeleteCustomer}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRestore={handleRestore}
                getCustomerStatus={getCustomerStatus}
              />
            ))
          )}
        </TableBody>
      </Table>
      
      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isEditing={isEditing}
        formDefaults={formDefaults}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
