
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { SalesRecord, Customer, Employee } from "../types";

export function useSalesData(showDeleted: boolean, isAdmin: boolean) {
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [deletedSales, setDeletedSales] = useState<SalesRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSales = async () => {
    setLoading(true);
    try {
      // Fetch active sales with customer and employee info
      const { data: activeSales, error: activeError } = await supabase
        .from('sales')
        .select(`
          *,
          customer:custno(custno, custname, address, payterm),
          employee:empno(empno, firstname, lastname)
        `)
        .is('deleted_at', null);
      
      if (activeError) throw activeError;

      // For each sale, fetch the modifier (user) data and payments separately
      const salesWithModifiers = await Promise.all((activeSales || []).map(async (sale) => {
        let modifierData = null;
        
        if (sale.modified_by) {
          // Fetch the user data from the profiles table
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sale.modified_by)
            .single();
          
          if (!userError && userData) {
            modifierData = {
              email: userData.id, // Use ID as email placeholder
              user_metadata: {
                first_name: userData.first_name,
                last_name: userData.last_name
              }
            };
          }
        }

        // For each sale, fetch the total amount from payments and/or sales details
        // First try to get from payments table
        const { data: payments, error: paymentsError } = await supabase
          .from('payment')
          .select('amount')
          .eq('transno', sale.transno);

        // Get the total from salesdetail and pricehist
        const { data: salesDetails, error: detailsError } = await supabase
          .from('salesdetail')
          .select(`
            quantity,
            prodcode,
            product:prodcode(*)
          `)
          .eq('transno', sale.transno)
          .is('deleted_at', null);

        // Calculate expected total from sales details and price history
        let expectedTotal = 0;
        if (!detailsError && salesDetails && salesDetails.length > 0) {
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
        }

        // Calculate total amount from payments or use expected total if no payments
        const paymentTotal = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
        const totalAmount = paymentTotal > 0 ? paymentTotal : expectedTotal;

        // Determine payment status based on sales details and payment amount
        let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
        if (totalAmount > 0) {
          if (paymentTotal >= expectedTotal && expectedTotal > 0) {
            paymentStatus = 'Paid';
          } else if (paymentTotal > 0) {
            paymentStatus = 'Partial';
          }
        }

        // Create a proper customer object that matches our Customer interface
        const customerData = sale.customer ? {
          custno: sale.customer.custno || sale.custno || '',
          custname: sale.customer.custname || null,
          address: sale.customer.address || null,
          city: null, // Add default values for properties not in DB
          phone: null, // Add default values for properties not in DB
          payterm: sale.customer.payterm || null
        } : null;

        // Make sure employee data has all required fields
        const employeeData = sale.employee ? {
          empno: sale.employee.empno || sale.empno || '',
          firstname: sale.employee.firstname || null,
          lastname: sale.employee.lastname || null,
          empname: sale.employee.firstname && sale.employee.lastname ? 
            `${sale.employee.firstname} ${sale.employee.lastname}` : null,
          position: null
        } : undefined;

        const enhancedSale: SalesRecord = {
          ...sale,
          customer: customerData,
          employee: employeeData,
          modifier: modifierData,
          total_amount: totalAmount,
          payment_status: paymentStatus
        };

        return enhancedSale;
      }));
      
      setSales(salesWithModifiers);
      
      // Fetch deleted sales if showing deleted
      if (showDeleted && isAdmin) {
        const { data: deletedSalesData, error: deletedError } = await supabase
          .from('sales')
          .select(`
            *,
            customer:custno(custno, custname, address, payterm),
            employee:empno(empno, firstname, lastname)
          `)
          .not('deleted_at', 'is', null);
        
        if (deletedError) throw deletedError;
        
        // Also add modifier and totals to deleted sales
        const deletedSalesWithModifiers = await Promise.all((deletedSalesData || []).map(async (sale) => {
          let modifierData = null;
          
          if (sale.modified_by) {
            const { data: userData, error: userError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sale.modified_by)
              .single();
            
            if (!userError && userData) {
              modifierData = {
                email: userData.id,
                user_metadata: {
                  first_name: userData.first_name,
                  last_name: userData.last_name
                }
              };
            }
          }

          // Get the total from salesdetail and pricehist for deleted sales too
          const { data: salesDetails, error: detailsError } = await supabase
            .from('salesdetail')
            .select(`
              quantity,
              prodcode,
              product:prodcode(*)
            `)
            .eq('transno', sale.transno);

          // Calculate expected total from sales details and price history
          let totalAmount = 0;
          if (!detailsError && salesDetails && salesDetails.length > 0) {
            for (const detail of salesDetails) {
              const { data: priceData, error: priceError } = await supabase
                .from('pricehist')
                .select('unitprice')
                .eq('prodcode', detail.prodcode)
                .order('effdate', { ascending: false })
                .limit(1);
                
              if (!priceError && priceData && priceData.length > 0) {
                const unitPrice = priceData[0].unitprice || 0;
                totalAmount += (unitPrice * (detail.quantity || 0));
              }
            }
          }
          
          // Create a proper customer object
          const customerData = sale.customer ? {
            custno: sale.customer.custno || sale.custno || '',
            custname: sale.customer.custname || null,
            address: sale.customer.address || null,
            city: null,
            phone: null,
            payterm: sale.customer.payterm || null
          } : null;
          
          // Ensure employee data has all required fields
          const employeeData = sale.employee ? {
            empno: sale.employee.empno || sale.empno || '',
            firstname: sale.employee.firstname || null,
            lastname: sale.employee.lastname || null,
            empname: sale.employee.firstname && sale.employee.lastname ? 
              `${sale.employee.firstname} ${sale.employee.lastname}` : null,
            position: null
          } : undefined;
          
          const enhancedDeletedSale: SalesRecord = {
            ...sale,
            customer: customerData,
            employee: employeeData,
            modifier: modifierData,
            total_amount: totalAmount
          };
          
          return enhancedDeletedSale;
        }));
        
        setDeletedSales(deletedSalesWithModifiers);
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
        .select('custno, custname, address, payterm')
        .is('deleted_at', null);
      
      if (error) throw error;
      
      // Add missing fields with default values to ensure type compatibility
      const customersWithDefaults = (data || []).map(customer => ({
        custno: customer.custno,
        custname: customer.custname,
        address: customer.address || null,
        city: null, // Adding default null value for city
        phone: null, // Adding default null value for phone
        payterm: customer.payterm || null
      }));
      
      setCustomers(customersWithDefaults);
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
      
      // Format employees data to match the Employee interface
      const formattedEmployees = (data || []).map(emp => ({
        empno: emp.empno,
        firstname: emp.firstname || null,
        lastname: emp.lastname || null,
        empname: emp.firstname && emp.lastname ? `${emp.firstname} ${emp.lastname}` : null,
        position: null // Default value since it's not fetched
      }));
      
      setEmployees(formattedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleDelete = async (sale: SalesRecord) => {
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      const userId = currentUser?.id || null;
      
      const { error } = await supabase
        .from('sales')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: userId
        })
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
      const currentUser = (await supabase.auth.getUser()).data.user;
      const userId = currentUser?.id || null;
      
      const { error } = await supabase
        .from('sales')
        .update({ 
          deleted_at: null,
          modified_at: new Date().toISOString(),
          modified_by: userId
        })
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

  const getRecordStatus = (sale: SalesRecord) => {
    if (sale.deleted_at) return 'Deleted';
    
    // Check if it was previously deleted and then restored
    if (sale.modified_at && !sale.deleted_at && 
        sale.modified_by !== null && sale.modified_by !== sale.created_by) {
      return 'Restored';
    }
    
    if (sale.modified_by !== null && sale.modified_at !== null) {
      return 'Edited';
    }
    
    return 'Added';
  };

  useEffect(() => {
    fetchSales();
    fetchCustomers();
    fetchEmployees();
  }, [showDeleted]);

  return {
    sales,
    deletedSales,
    customers,
    employees,
    loading,
    fetchSales,
    handleDelete,
    handleRestore,
    getRecordStatus
  };
}
