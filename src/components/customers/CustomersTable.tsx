import { useState, useEffect, useMemo } from "react";
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, ArrowUpDown } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CustomersTableProps {
  sortOrder?: "asc" | "desc";
}

export function CustomersTable({ sortOrder = "asc" }: CustomersTableProps) {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortField, setSortField] = useState<"custno" | "custname" | "payterm">("custno");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(sortOrder);
  
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
        can_add_salesdetails: true,
        can_edit_salesdetails: true,
        can_delete_salesdetails: true,
        created_at: "",
        updated_at: ""
      });
    }
  }, [showDeleted, isAdmin, user]);

  // Apply the sort order from props
  useEffect(() => {
    setSortDirection(sortOrder);
    loadCustomersData();
  }, [sortOrder]);

  const loadCustomersData = async () => {
    setLoading(true);
    try {
      // Fetch active customers
      const activeCustomers = await fetchCustomers();
      setCustomers(activeCustomers);
      
      // Fetch deleted customers if showing deleted
      if (showDeleted && isAdmin) {
        const deletedCustomersData = await fetchDeletedCustomers();
        setDeletedCustomers(deletedCustomersData);
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
          can_add_salesdetails: false,
          can_edit_salesdetails: false,
          can_delete_salesdetails: false,
          created_at: "",
          updated_at: ""
        });
        return;
      }
      
      if (data) {
        // Add new properties with default values if they don't exist in the data
        setUserPermissions({
          ...data,
          can_add_salesdetails: data.can_add_salesdetails !== undefined ? data.can_add_salesdetails : false,
          can_edit_salesdetails: data.can_edit_salesdetails !== undefined ? data.can_edit_salesdetails : false,
          can_delete_salesdetails: data.can_delete_salesdetails !== undefined ? data.can_delete_salesdetails : false
        } as UserPermission);
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
      const result = await restoreCustomer(customer);
      
      toast({
        title: "Customer Restored",
        description: `Customer ${customer.custname} has been restored.`,
      });
      
      // Add the restored customer to the active customers list with the 'restore' action
      const restoredCustomer = {
        ...customer,
        deleted_at: null,
        action: 'restore'  // This ensures the status shows as "Restored"
      };
      
      // Update the customers list to include the restored customer
      setCustomers(prevCustomers => [restoredCustomer, ...prevCustomers]);
      
      // Remove from deleted customers list
      setDeletedCustomers(prevDeleted => 
        prevDeleted.filter(c => c.custno !== customer.custno)
      );
      
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
        
        // Update the customer in the state with 'Edited' status
        setCustomers(prev => prev.map(cust => 
          cust.custno === selectedCustomer.custno 
            ? { ...cust, 
                custname: values.custname, 
                address: values.address, 
                payterm: values.payterm, 
                modified_at: new Date().toISOString() // Add modified timestamp for status tracking
              } 
            : cust
        ));
        
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
        
        // Add the new customer to the state
        const newCustomer = {
          custno: values.custno,
          custname: values.custname,
          address: values.address,
          payterm: values.payterm,
          deleted_at: null,
          action: 'add' // Mark as newly added
        };
        
        setCustomers(prev => [newCustomer, ...prev]);
        
        toast({
          title: "Customer Created",
          description: `Customer ${values.custname} has been created successfully.`,
        });
      }
      
      setDialogOpen(false);
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

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    const dataSource = showDeleted ? deletedCustomers : customers;
    
    return dataSource.filter(customer => {
      // Apply search filter
      const matchesSearch = searchQuery === "" || 
        (customer.custname?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        customer.custno.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.address?.toLowerCase().includes(searchQuery.toLowerCase()));

      // Apply status filter
      let matchesStatus = true;
      if (statusFilter !== "All Status") {
        const status = getCustomerStatus(customer);
        matchesStatus = statusFilter === status;
      }

      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      // Apply sorting
      let comparison = 0;
      
      if (sortField === "custno") {
        comparison = a.custno.localeCompare(b.custno);
      } else if (sortField === "custname") {
        comparison = (a.custname || "").localeCompare(b.custname || "");
      } else if (sortField === "payterm") {
        comparison = (a.payterm || "").localeCompare(b.payterm || "");
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [customers, deletedCustomers, showDeleted, searchQuery, statusFilter, sortField, sortDirection]);

  const toggleSort = (field: "custno" | "custname" | "payterm") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Customers</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toggleSort("custno")}>
            <span className="mr-1">No</span>
            <ArrowUpDown size={16} />
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => setShowDeleted(!showDeleted)}
            >
              {showDeleted ? "Show Active" : "Show Deleted"}
            </Button>
          )}
          {canAddCustomer && (
            <Button onClick={prepareNewCustomerForm}>
              <Plus size={16} className="mr-2" /> Add Customer
            </Button>
          )}
        </div>
      </div>
      
      {/* Search and Filter Controls */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search customers..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All Status">All Status</SelectItem>
            <SelectItem value="Added">Added</SelectItem>
            <SelectItem value="Edited">Edited</SelectItem>
            <SelectItem value="Restored">Restored</SelectItem>
            {showDeleted && <SelectItem value="Deleted">Deleted</SelectItem>}
          </SelectContent>
        </Select>
        
        <Select value={sortField} onValueChange={(value: any) => setSortField(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custno">Customer No</SelectItem>
            <SelectItem value="custname">Customer Name</SelectItem>
            <SelectItem value="payterm">Payment Term</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Table>
        <TableCaption>{loading ? 'Loading customers...' : 'List of customers.'}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer" onClick={() => toggleSort("custno")}>
              Customer No {sortField === "custno" && (sortDirection === "asc" ? "↑" : "↓")}
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort("custname")}>
              Name {sortField === "custname" && (sortDirection === "asc" ? "↑" : "↓")}
            </TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort("payterm")}>
              Payment Term {sortField === "payterm" && (sortDirection === "asc" ? "↑" : "↓")}
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCustomers.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                {showDeleted ? "No deleted customers found." : "No customers found."}
              </TableCell>
            </TableRow>
          ) : (
            filteredCustomers.map((customer) => (
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
