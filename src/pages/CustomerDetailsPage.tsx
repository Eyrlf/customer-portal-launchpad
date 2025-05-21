
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Customer, SalesRecord, Payment } from "@/components/sales/types";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CustomerDetailsPage = () => {
  const { custno } = useParams<{ custno: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthenticated, isLoading, navigate]);
  
  useEffect(() => {
    if (!custno) return;
    
    const fetchCustomerDetails = async () => {
      setLoading(true);
      try {
        // Fetch customer info
        const { data: customerData, error: customerError } = await supabase
          .from('customer')
          .select('*')
          .eq('custno', custno)
          .single();
        
        if (customerError) throw customerError;
        
        // Convert customerData to match Customer interface
        const formattedCustomer: Customer = {
          custno: customerData.custno,
          custname: customerData.custname,
          address: customerData.address,
          city: null, // Add null as default if not in database
          phone: customerData.phone || null,
          payterm: customerData.payterm
        };
        
        setCustomer(formattedCustomer);
        
        // Fetch sales for this customer
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select(`
            *,
            customer:custno(custname, custno, address, phone, payterm)
          `)
          .eq('custno', custno)
          .is('deleted_at', null);
        
        if (salesError) throw salesError;

        // For each sale, fetch the modifier (user) data and payments separately
        const salesWithTotals = await Promise.all((salesData || []).map(async (sale) => {
          // For each sale, fetch the modifier (user) data separately
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

          // Get payments for this sale
          const { data: salePayments, error: paymentsError } = await supabase
            .from('payment')
            .select('amount')
            .eq('transno', sale.transno);

          if (paymentsError) {
            console.error('Error fetching payments:', paymentsError);
            return {
              ...sale,
              modifier: modifierData,
              total_amount: 0,
              created_at: sale.created_at || new Date().toISOString(),
              created_by: sale.created_by || null,
              deleted_by: sale.deleted_by || null
            } as SalesRecord;
          }

          // Calculate total amount from payments
          const totalAmount = salePayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

          return {
            ...sale,
            modifier: modifierData,
            total_amount: totalAmount,
            created_at: sale.created_at || new Date().toISOString(),
            created_by: sale.created_by || null,
            deleted_by: sale.deleted_by || null
          } as SalesRecord;
        }));

        setSales(salesWithTotals);
        
        // Fetch all payments for this customer's sales
        if (salesData && salesData.length > 0) {
          const transactionNumbers = salesData.map(sale => sale.transno);
          
          const { data: paymentsData, error: paymentsError } = await supabase
            .from('payment')
            .select('*')
            .in('transno', transactionNumbers);
          
          if (paymentsError) throw paymentsError;
          setPayments(paymentsData as Payment[]);
        }
      } catch (error) {
        console.error('Error fetching customer details:', error);
        toast({
          title: "Error",
          description: "Failed to fetch customer details.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomerDetails();
  }, [custno, toast]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PP');
    } catch {
      return 'Invalid date';
    }
  };

  if (isLoading || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/customers')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Customers
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-40" /></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-48" /></CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/customers')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Customers
          </Button>
        </div>
        
        {customer ? (
          <>
            {/* Customer Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">Customer Number</p>
                    <p>{customer.custno}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Customer Name</p>
                    <p>{customer.custname || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Address</p>
                    <p>{customer.address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Payment Terms</p>
                    <p>{customer.payterm || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sales Transactions - Simplified */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableCaption>List of sales transactions for this customer</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">No sales records found.</TableCell>
                      </TableRow>
                    ) : (
                      sales.map((sale) => (
                        <TableRow key={sale.transno}>
                          <TableCell>
                            <Button 
                              variant="link" 
                              className="p-0 h-auto"
                              onClick={() => navigate(`/dashboard/sales/${sale.transno}`)}
                            >
                              {sale.transno}
                            </Button>
                          </TableCell>
                          <TableCell>{formatDate(sale.salesdate)}</TableCell>
                          <TableCell>${sale.total_amount?.toFixed(2) || '0.00'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Records</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableCaption>List of payments made by this customer</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OR Number</TableHead>
                      <TableHead>Transaction No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">No payment records found.</TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment.orno}>
                          <TableCell>{payment.orno}</TableCell>
                          <TableCell>{payment.transno || 'N/A'}</TableCell>
                          <TableCell>{formatDate(payment.paydate)}</TableCell>
                          <TableCell>${payment.amount?.toFixed(2) || '0.00'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-lg">Customer not found.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CustomerDetailsPage;
