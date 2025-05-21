
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
          customer:custno(custname),
          employee:empno(firstname, lastname)
        `)
        .is('deleted_at', null);
      
      if (activeError) throw activeError;

      // For each sale, fetch the modifier (user) data separately
      const salesWithModifiers = await Promise.all((activeSales || []).map(async (sale) => {
        let modifierData = null;
        
        if (sale.modified_by) {
          // Fetch the user data from the profiles table instead
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sale.modified_by)
            .single();
          
          if (!userError && userData) {
            modifierData = {
              email: userData.id, // Use ID as email placeholder since we can't access auth.users
              user_metadata: {
                first_name: userData.first_name,
                last_name: userData.last_name
              }
            };
          }
        }

        // For each sale, fetch the total amount from payments
        const { data: payments, error: paymentsError } = await supabase
          .from('payment')
          .select('amount')
          .eq('transno', sale.transno);

        if (paymentsError) {
          console.error('Error fetching payments:', paymentsError);
          return {
            ...sale,
            modifier: modifierData,
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
          modifier: modifierData,
          total_amount: totalAmount,
          payment_status: paymentStatus
        };
      }));
      
      setSales(salesWithModifiers as SalesRecord[]);
      
      // Fetch deleted sales if showing deleted
      if (showDeleted && isAdmin) {
        const { data: deletedSalesData, error: deletedError } = await supabase
          .from('sales')
          .select(`
            *,
            customer:custno(custname),
            employee:empno(firstname, lastname)
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
          
          return {
            ...sale,
            modifier: modifierData
          };
        }));
        
        setDeletedSales(deletedSalesWithModifiers as SalesRecord[]);
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
    handleRestore
  };
}
