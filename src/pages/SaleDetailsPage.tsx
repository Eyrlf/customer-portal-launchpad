
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { SalesRecord, Payment } from "@/components/sales/types";
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

const SaleDetailsPage = () => {
  const { transno } = useParams<{ transno: string }>();
  const [sale, setSale] = useState<SalesRecord | null>(null);
  const [salesDetails, setSalesDetails] = useState<any[]>([]);
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
    if (!transno) return;
    
    const fetchSaleDetails = async () => {
      setLoading(true);
      try {
        // Fetch sale info
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .select(`
            *,
            customer:custno(custname, custno)
          `)
          .eq('transno', transno)
          .single();
        
        if (saleError) throw saleError;
        setSale(saleData as SalesRecord);
        
        // Fetch sales details for this transaction
        const { data: detailsData, error: detailsError } = await supabase
          .from('salesdetail')
          .select(`
            *,
            product:prodcode(*)
          `)
          .eq('transno', transno);
        
        if (detailsError) throw detailsError;
        setSalesDetails(detailsData || []);
        
        // Fetch payments for this transaction
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payment')
          .select('*')
          .eq('transno', transno);
        
        if (paymentsError) throw paymentsError;
        setPayments(paymentsData as Payment[] || []);
      } catch (error) {
        console.error('Error fetching sale details:', error);
        toast({
          title: "Error",
          description: "Failed to fetch sale details.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSaleDetails();
  }, [transno, toast]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PP');
    } catch {
      return 'Invalid date';
    }
  };

  // Calculate total amount from sales details
  const calculateTotalAmount = () => {
    if (!salesDetails || salesDetails.length === 0) return 0;
    
    let total = 0;
    salesDetails.forEach(detail => {
      const unitPrice = detail.product?.unitprice || 0;
      const quantity = detail.quantity || 0;
      total += unitPrice * quantity;
    });
    
    return total;
  };

  // Calculate payments total
  const calculatePaymentsTotal = () => {
    if (!payments || payments.length === 0) return 0;
    
    return payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  };

  if (isLoading || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/sales')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sales
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
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard/sales')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sales
          </Button>
        </div>
        
        {sale ? (
          <>
            {/* Sale Information Card - Simplified */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Transaction Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">Transaction Number</p>
                    <p>{sale.transno}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Sale Date</p>
                    <p>{formatDate(sale.salesdate)}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Customer</p>
                    <p>
                      {sale.customer ? (
                        <Button 
                          variant="link" 
                          className="p-0 h-auto"
                          onClick={() => navigate(`/dashboard/customers/${sale.custno}`)}
                        >
                          {sale.customer.custname || sale.custno || 'N/A'}
                        </Button>
                      ) : (
                        sale.custno || 'N/A'
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">Total Amount</p>
                    <p>${calculateTotalAmount().toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sales Details */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableCaption>List of items in this transaction</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesDetails.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No sales details found.</TableCell>
                      </TableRow>
                    ) : (
                      salesDetails.map((detail) => {
                        const unitPrice = detail.product?.unitprice || 0;
                        const quantity = detail.quantity || 0;
                        const amount = unitPrice * quantity;
                        
                        return (
                          <TableRow key={`${detail.transno}-${detail.prodcode}`}>
                            <TableCell>{detail.prodcode}</TableCell>
                            <TableCell>{detail.product?.description || 'N/A'}</TableCell>
                            <TableCell>{quantity}</TableCell>
                            <TableCell>{detail.product?.unit || 'N/A'}</TableCell>
                            <TableCell>${amount.toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-bold">Total:</TableCell>
                      <TableCell className="font-bold">${calculateTotalAmount().toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Payments - Without Balance */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Records</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableCaption>List of payments for this transaction</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OR Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">No payment records found.</TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment.orno}>
                          <TableCell>{payment.orno}</TableCell>
                          <TableCell>{formatDate(payment.paydate)}</TableCell>
                          <TableCell>${payment.amount?.toFixed(2) || '0.00'}</TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow>
                      <TableCell colSpan={2} className="text-right font-bold">Total Payments:</TableCell>
                      <TableCell className="font-bold">${calculatePaymentsTotal().toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-lg">Transaction not found.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SaleDetailsPage;
