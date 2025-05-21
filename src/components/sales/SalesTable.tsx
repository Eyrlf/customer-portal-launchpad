
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
import { format } from "date-fns";
import { Plus, Edit, Trash, MoreVertical, RefreshCcw, Eye } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Allow for the error case in the modifier type
type UserModifier = {
  email: string;
  user_metadata: {
    first_name?: string;
    last_name?: string;
  };
}

type SelectQueryErrorType = {
  error: true;
} & String;

interface SalesRecord {
  transno: string;
  salesdate: string | null;
  custno: string | null;
  empno: string | null;
  deleted_at: string | null;
  modified_at: string | null;
  modified_by: string | null;
  customer?: {
    custname: string;
  };
  employee?: {
    firstname: string;
    lastname: string;
  };
  // Updated modifier type to handle both successful and error cases
  modifier?: UserModifier | null | SelectQueryErrorType;
  total_amount?: number;
  payment_status?: 'Paid' | 'Partial' | 'Unpaid';
}

interface Customer {
  custno: string;
  custname: string;
}

interface Employee {
  empno: string;
  firstname: string;
  lastname: string;
}

export function SalesTable() {
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [deletedSales, setDeletedSales] = useState<SalesRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SalesRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const formSchema = z.object({
    transno: z.string().min(1, "Transaction number is required"),
    salesdate: z.date().nullable(),
    custno: z.string().nullable(),
    empno: z.string().nullable(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transno: "",
      salesdate: null,
      custno: null,
      empno: null,
    },
  });

  useEffect(() => {
    fetchSales();
    fetchCustomers();
    fetchEmployees();
  }, [showDeleted]);

  useEffect(() => {
    if (selectedSale && isEditing) {
      form.reset({
        transno: selectedSale.transno,
        salesdate: selectedSale.salesdate ? new Date(selectedSale.salesdate) : null,
        custno: selectedSale.custno,
        empno: selectedSale.empno,
      });
    } else if (!isEditing) {
      form.reset({
        transno: "",
        salesdate: new Date(),
        custno: null,
        empno: null,
      });
    }
  }, [selectedSale, isEditing, form]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      // Fetch active sales with total amount and payment info
      const { data: activeSales, error: activeError } = await supabase
        .from('sales')
        .select(`
          *,
          customer:custno(custname),
          employee:empno(firstname, lastname),
          modifier:modified_by(email, user_metadata)
        `)
        .is('deleted_at', null);
      
      if (activeError) throw activeError;

      // For each sale, fetch the total amount from payments
      const salesWithTotals = await Promise.all((activeSales || []).map(async (sale) => {
        // Get payments for this sale
        const { data: payments, error: paymentsError } = await supabase
          .from('payment')
          .select('amount')
          .eq('transno', sale.transno);

        if (paymentsError) {
          console.error('Error fetching payments:', paymentsError);
          return {
            ...sale,
            total_amount: 0,
            payment_status: 'Unpaid' as const
          };
        }

        // Calculate total amount from payments
        const totalAmount = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

        // Determine payment status based on sales details and payment amount
        let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
        
        // Get sales details to determine expected total
        const { data: salesDetails, error: detailsError } = await supabase
          .from('salesdetail')
          .select(`
            quantity,
            prodcode,
            product:prodcode(*)
          `)
          .eq('transno', sale.transno);

        if (!detailsError && salesDetails && salesDetails.length > 0) {
          // Now we'll fetch the price history for each product
          let expectedTotal = 0;
          
          for (const detail of salesDetails) {
            const { data: priceData, error: priceError } = await supabase
              .from('pricehist')
              .select('unitprice')
              .eq('prodcode', detail.prodcode)
              .order('effdate', { ascending: false })
              .limit(1);
              
            if (!priceError && priceData && priceData.length > 0) {
              const unitPrice = priceData[0].unitprice || 0;
              expectedTotal += (unitPrice * (detail.quantity || 0));
            }
          }

          if (totalAmount >= expectedTotal && expectedTotal > 0) {
            paymentStatus = 'Paid';
          } else if (totalAmount > 0) {
            paymentStatus = 'Partial';
          }
        }

        return {
          ...sale,
          total_amount: totalAmount,
          payment_status: paymentStatus
        };
      }));
      
      // Use proper type assertion with unknown as intermediate step
      setSales(salesWithTotals as unknown as SalesRecord[]);
      
      // Fetch deleted sales if showing deleted
      if (showDeleted && isAdmin) {
        const { data: deletedSalesData, error: deletedError } = await supabase
          .from('sales')
          .select(`
            *,
            customer:custno(custname),
            employee:empno(firstname, lastname),
            modifier:modified_by(email, user_metadata)
          `)
          .not('deleted_at', 'is', null);
        
        if (deletedError) throw deletedError;
        setDeletedSales(deletedSalesData as unknown as SalesRecord[] || []);
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sales data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customer')
        .select('custno, custname')
        .is('deleted_at', null);
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employee')
        .select('empno, firstname, lastname');
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (isEditing && selectedSale) {
        // Update existing sale
        const { data, error } = await supabase
          .from('sales')
          .update({
            salesdate: values.salesdate?.toISOString(),
            custno: values.custno,
            empno: values.empno,
          })
          .eq('transno', selectedSale.transno);
        
        if (error) throw error;
        
        toast({
          title: "Sale Updated",
          description: `Sale #${selectedSale.transno} has been updated successfully.`,
        });
        
        // Log activity
        await supabase.rpc('log_activity', {
          action: 'update',
          table_name: 'sales',
          record_id: selectedSale.transno,
          details: JSON.stringify(values),
        });
      } else {
        // Create new sale
        const { data, error } = await supabase
          .from('sales')
          .insert({
            transno: values.transno,
            salesdate: values.salesdate?.toISOString(),
            custno: values.custno,
            empno: values.empno,
          });
        
        if (error) {
          if (error.code === '23505') {
            toast({
              title: "Error",
              description: "Transaction number already exists.",
              variant: "destructive",
            });
            return;
          }
          throw error;
        }
        
        toast({
          title: "Sale Created",
          description: `Sale #${values.transno} has been created successfully.`,
        });
        
        // Log activity
        await supabase.rpc('log_activity', {
          action: 'insert',
          table_name: 'sales',
          record_id: values.transno,
          details: JSON.stringify(values),
        });
      }
      
      setDialogOpen(false);
      fetchSales();
    } catch (error) {
      console.error('Error submitting sale:', error);
      toast({
        title: "Error",
        description: "Failed to save sale data.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (sale: SalesRecord) => {
    setSelectedSale(sale);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDelete = async (sale: SalesRecord) => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .update({ deleted_at: new Date().toISOString() })
        .eq('transno', sale.transno);
      
      if (error) throw error;
      
      toast({
        title: "Sale Deleted",
        description: `Sale #${sale.transno} has been deleted.`,
      });
      
      // Log activity
      await supabase.rpc('log_activity', {
        action: 'delete',
        table_name: 'sales',
        record_id: sale.transno,
        details: JSON.stringify(sale),
      });
      
      fetchSales();
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast({
        title: "Error",
        description: "Failed to delete sale.",
        variant: "destructive",
      });
    }
  };

  const handleRestore = async (sale: SalesRecord) => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .update({ deleted_at: null })
        .eq('transno', sale.transno);
      
      if (error) throw error;
      
      toast({
        title: "Sale Restored",
        description: `Sale #${sale.transno} has been restored.`,
      });
      
      // Log activity
      await supabase.rpc('log_activity', {
        action: 'restore',
        table_name: 'sales',
        record_id: sale.transno,
        details: JSON.stringify(sale),
      });
      
      fetchSales();
    } catch (error) {
      console.error('Error restoring sale:', error);
      toast({
        title: "Error",
        description: "Failed to restore sale.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PP');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatModifierInfo = (sale: SalesRecord) => {
    if (!sale.modified_by || !sale.modified_at) return 'N/A';
    
    let name = 'Unknown User';
    // Check if modifier exists and is not an error
    if (sale.modifier && typeof sale.modifier === 'object' && !('error' in sale.modifier) && sale.modifier !== null) {
      if (sale.modifier.user_metadata?.first_name || sale.modifier.user_metadata?.last_name) {
        name = `${sale.modifier.user_metadata.first_name || ''} ${sale.modifier.user_metadata.last_name || ''}`.trim();
      } else if ('email' in sale.modifier) {
        name = sale.modifier.email;
      }
    }

    try {
      const timestamp = format(new Date(sale.modified_at), 'dd-MM-yyyy HH:mm:ss');
      return `${name}\n${timestamp}`;
    } catch (e) {
      return `${name}\nUnknown date`;
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    
    switch (status) {
      case 'Paid':
        return <Badge className="bg-green-500 text-white">Paid</Badge>;
      case 'Partial':
        return <Badge className="bg-yellow-500 text-white">Partial</Badge>;
      case 'Unpaid':
        return <Badge variant="destructive">Unpaid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Sales</h2>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => setShowDeleted(!showDeleted)}
            >
              {showDeleted ? "Hide Deleted" : "Show Deleted"}
            </Button>
          )}
          <Button
            onClick={() => {
              setIsEditing(false);
              setSelectedSale(null);
              setDialogOpen(true);
            }}
          >
            <Plus size={16} className="mr-2" /> Add Sale
          </Button>
        </div>
      </div>
      
      <Table>
        <TableCaption>{loading ? 'Loading sales...' : 'List of sales transactions.'}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction No</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stamp</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!showDeleted && sales.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">No sales found.</TableCell>
            </TableRow>
          ) : showDeleted && deletedSales.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">No deleted sales found.</TableCell>
            </TableRow>
          ) : (
            (showDeleted ? deletedSales : sales).map((sale) => (
              <TableRow key={sale.transno} className={showDeleted ? "bg-gray-50" : ""}>
                <TableCell>{sale.transno}</TableCell>
                <TableCell>{formatDate(sale.salesdate)}</TableCell>
                <TableCell>${sale.total_amount?.toFixed(2) || '0.00'}</TableCell>
                <TableCell>
                  {sale.customer?.custname || sale.custno || 'N/A'}
                </TableCell>
                <TableCell>
                  {getStatusBadge(sale.payment_status)}
                </TableCell>
                <TableCell className="whitespace-pre-line text-xs">
                  {formatModifierInfo(sale)}
                </TableCell>
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
                            <DropdownMenuItem onClick={() => handleRestore(sale)}>
                              <RefreshCcw className="mr-2 h-4 w-4" />
                              Restore
                            </DropdownMenuItem>
                          )}
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => {/* View details */}}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(sale)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => handleDelete(sale)}>
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
            <DialogTitle>{isEditing ? 'Edit Sale' : 'Add New Sale'}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="transno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction No</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="salesdate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Sale Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="custno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.custno} value={customer.custno}>
                            {customer.custname} ({customer.custno})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="empno"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.empno} value={employee.empno}>
                            {employee.firstname} {employee.lastname} ({employee.empno})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
