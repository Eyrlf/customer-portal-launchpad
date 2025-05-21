
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, DropdownMenuContent, 
  DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit, Trash, MoreVertical, RefreshCcw } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, 
  FormLabel, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface Customer {
  custno: string;
  custname: string | null;
  address: string | null;
  payterm: string | null;
  deleted_at: string | null;
}

interface UserPermissions {
  can_add_customers: boolean;
  can_edit_customers: boolean;
  can_delete_customers: boolean;
}

export function CustomersTable() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deletedCustomers, setDeletedCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    can_add_customers: false,
    can_edit_customers: false,
    can_delete_customers: false,
  });
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();

  const formSchema = z.object({
    custno: z.string().min(1, "Customer number is required"),
    custname: z.string().min(1, "Customer name is required"),
    address: z.string().optional(),
    payterm: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      custno: "",
      custname: "",
      address: "",
      payterm: "",
    },
  });

  useEffect(() => {
    fetchCustomers();
    if (user && !isAdmin) {
      fetchUserPermissions();
    } else if (isAdmin) {
      // Admins have all permissions
      setUserPermissions({
        can_add_customers: true,
        can_edit_customers: true,
        can_delete_customers: true,
      });
    }
  }, [showDeleted, isAdmin, user]);

  useEffect(() => {
    if (selectedCustomer && isEditing) {
      form.reset({
        custno: selectedCustomer.custno,
        custname: selectedCustomer.custname || "",
        address: selectedCustomer.address || "",
        payterm: selectedCustomer.payterm || "",
      });
    } else if (!isEditing) {
      form.reset({
        custno: "",
        custname: "",
        address: "",
        payterm: "",
      });
    }
  }, [selectedCustomer, isEditing, form]);

  const fetchUserPermissions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('can_add_customers, can_edit_customers, can_delete_customers')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user permissions:', error);
        return;
      }
      
      if (data) {
        setUserPermissions({
          can_add_customers: data.can_add_customers,
          can_edit_customers: data.can_edit_customers,
          can_delete_customers: data.can_delete_customers,
        });
      } else {
        // Default to no permissions if none are set
        setUserPermissions({
          can_add_customers: false,
          can_edit_customers: false,
          can_delete_customers: false,
        });
      }
    } catch (error) {
      console.error('Error in fetchUserPermissions:', error);
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Fetch active customers
      const { data: activeCustomers, error: activeError } = await supabase
        .from('customer')
        .select('*')
        .is('deleted_at', null);
      
      if (activeError) throw activeError;
      setCustomers(activeCustomers || []);
      
      // Fetch deleted customers if showing deleted
      if (showDeleted && isAdmin) {
        const { data: deletedCustomers, error: deletedError } = await supabase
          .from('customer')
          .select('*')
          .not('deleted_at', 'is', null);
        
        if (deletedError) throw deletedError;
        setDeletedCustomers(deletedCustomers || []);
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

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (isEditing && selectedCustomer) {
        if (!userPermissions.can_edit_customers && !isAdmin) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to edit customers.",
            variant: "destructive",
          });
          return;
        }
        
        // Update existing customer
        const { data, error } = await supabase
          .from('customer')
          .update({
            custname: values.custname,
            address: values.address,
            payterm: values.payterm,
          })
          .eq('custno', selectedCustomer.custno);
        
        if (error) throw error;
        
        toast({
          title: "Customer Updated",
          description: `Customer ${values.custname} has been updated successfully.`,
        });
        
        // Log activity
        await supabase.rpc('log_activity', {
          action: 'update',
          table_name: 'customer',
          record_id: selectedCustomer.custno,
          details: JSON.stringify(values),
        });
      } else {
        if (!userPermissions.can_add_customers && !isAdmin) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to add customers.",
            variant: "destructive",
          });
          return;
        }
        
        // Create new customer
        const { data, error } = await supabase
          .from('customer')
          .insert({
            custno: values.custno,
            custname: values.custname,
            address: values.address,
            payterm: values.payterm,
          });
        
        if (error) {
          if (error.code === '23505') {
            toast({
              title: "Error",
              description: "Customer number already exists.",
              variant: "destructive",
            });
            return;
          }
          throw error;
        }
        
        toast({
          title: "Customer Created",
          description: `Customer ${values.custname} has been created successfully.`,
        });
        
        // Log activity
        await supabase.rpc('log_activity', {
          action: 'insert',
          table_name: 'customer',
          record_id: values.custno,
          details: JSON.stringify(values),
        });
      }
      
      setDialogOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error submitting customer:', error);
      toast({
        title: "Error",
        description: "Failed to save customer data.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    if (!userPermissions.can_edit_customers && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit customers.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedCustomer(customer);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (!userPermissions.can_delete_customers && !isAdmin) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete customers.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('customer')
        .update({ deleted_at: new Date().toISOString() })
        .eq('custno', customer.custno);
      
      if (error) throw error;
      
      toast({
        title: "Customer Deleted",
        description: `Customer ${customer.custname} has been deleted.`,
      });
      
      // Log activity
      await supabase.rpc('log_activity', {
        action: 'delete',
        table_name: 'customer',
        record_id: customer.custno,
        details: JSON.stringify(customer),
      });
      
      fetchCustomers();
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
      const { data, error } = await supabase
        .from('customer')
        .update({ deleted_at: null })
        .eq('custno', customer.custno);
      
      if (error) throw error;
      
      toast({
        title: "Customer Restored",
        description: `Customer ${customer.custname} has been restored.`,
      });
      
      // Log activity
      await supabase.rpc('log_activity', {
        action: 'restore',
        table_name: 'customer',
        record_id: customer.custno,
        details: JSON.stringify(customer),
      });
      
      fetchCustomers();
    } catch (error) {
      console.error('Error restoring customer:', error);
      toast({
        title: "Error",
        description: "Failed to restore customer.",
        variant: "destructive",
      });
    }
  };

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
          {(userPermissions.can_add_customers || isAdmin) && (
            <Button
              onClick={() => {
                setIsEditing(false);
                setSelectedCustomer(null);
                setDialogOpen(true);
              }}
            >
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
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!showDeleted && customers.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">No customers found.</TableCell>
            </TableRow>
          ) : showDeleted && deletedCustomers.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">No deleted customers found.</TableCell>
            </TableRow>
          ) : (
            (showDeleted ? deletedCustomers : customers).map((customer) => (
              <TableRow key={customer.custno} className={showDeleted ? "bg-gray-50" : ""}>
                <TableCell>{customer.custno}</TableCell>
                <TableCell>{customer.custname || 'N/A'}</TableCell>
                <TableCell>{customer.address || 'N/A'}</TableCell>
                <TableCell>{customer.payterm || 'N/A'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {showDeleted ? (
                        <>
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => handleRestore(customer)}>
                              <RefreshCcw className="mr-2 h-4 w-4" />
                              Restore
                            </DropdownMenuItem>
                          )}
                        </>
                      ) : (
                        <>
                          {(userPermissions.can_edit_customers || isAdmin) && (
                            <DropdownMenuItem onClick={() => handleEdit(customer)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {(userPermissions.can_delete_customers || isAdmin) && (
                            <DropdownMenuItem onClick={() => handleDelete(customer)}>
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="custno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer No</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="custname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="payterm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Term</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{isEditing ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
