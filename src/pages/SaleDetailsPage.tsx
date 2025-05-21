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
import { ArrowLeft, Edit, Plus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

interface Product {
  prodcode: string;
  description: string | null;
  unit: string | null;
}

interface SalesDetailWithProduct {
  transno: string;
  prodcode: string;
  quantity: number | null;
  product?: {
    prodcode: string;
    description: string | null;
    unit: string | null;
  };
  unitprice?: number | null;
}

interface SalesDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SalesDetailFormValues) => void;
  salesDetail?: SalesDetailWithProduct | null;
  isEditing: boolean;
  products: Product[];
}

const salesDetailFormSchema = z.object({
  prodcode: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
});

type SalesDetailFormValues = z.infer<typeof salesDetailFormSchema>;

// Sales Detail Dialog Component
const SalesDetailDialog = ({
  isOpen,
  onClose,
  onSave,
  salesDetail,
  isEditing,
  products,
}: SalesDetailDialogProps) => {
  const form = useForm<SalesDetailFormValues>({
    resolver: zodResolver(salesDetailFormSchema),
    defaultValues: {
      prodcode: salesDetail?.prodcode || "",
      quantity: salesDetail?.quantity || 1,
    },
  });

  useEffect(() => {
    if (salesDetail) {
      form.reset({
        prodcode: salesDetail.prodcode,
        quantity: salesDetail.quantity || 1,
      });
    } else {
      form.reset({
        prodcode: "",
        quantity: 1,
      });
    }
  }, [salesDetail, form]);

  const handleSubmit = (values: SalesDetailFormValues) => {
    onSave(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Sales Detail" : "Add Sales Detail"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the product details below."
              : "Add a new product to this transaction."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="prodcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.prodcode} value={product.prodcode}>
                          {product.prodcode} - {product.description}
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
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      min={1}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const SaleDetailsPage = () => {
  const { transno } = useParams<{ transno: string }>();
  const [sale, setSale] = useState<SalesRecord | null>(null);
  const [salesDetails, setSalesDetails] = useState<SalesDetailWithProduct[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentSalesDetail, setCurrentSalesDetail] = useState<SalesDetailWithProduct | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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
        
        // Format sale data to match SalesRecord interface
        const formattedSale: SalesRecord = {
          ...saleData,
          created_at: saleData.created_at || "",
          created_by: saleData.created_by || null,
          deleted_by: saleData.deleted_by || null
        };
        
        setSale(formattedSale);
        
        // Fetch sales details with latest price history
        const { data: detailsData, error: detailsError } = await supabase
          .from('salesdetail')
          .select(`
            *,
            product:prodcode(*)
          `)
          .eq('transno', transno);
        
        if (detailsError) throw detailsError;
        
        // For each sales detail, get the unit price from pricehist
        const detailsWithPrices = await Promise.all((detailsData || []).map(async (detail) => {
          // Get the latest price before or on the sales date
          const { data: priceData } = await supabase
            .from('pricehist')
            .select('unitprice')
            .eq('prodcode', detail.prodcode)
            .lte('effdate', saleData.salesdate || new Date().toISOString())
            .order('effdate', { ascending: false })
            .limit(1);
            
          return {
            ...detail,
            unitprice: priceData && priceData.length > 0 ? priceData[0].unitprice : 0
          };
        }));
        
        setSalesDetails(detailsWithPrices as SalesDetailWithProduct[]);
        
        // Fetch payments for this transaction
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payment')
          .select('*')
          .eq('transno', transno);
        
        if (paymentsError) throw paymentsError;
        setPayments(paymentsData as Payment[] || []);
        
        // Fetch all products for the dialog
        const { data: productsData, error: productsError } = await supabase
          .from('product')
          .select('*')
          .order('prodcode');
          
        if (productsError) throw productsError;
        setProducts(productsData as Product[] || []);
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
      const unitPrice = detail.unitprice || 0;
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

  const handleAddSalesDetail = () => {
    setCurrentSalesDetail(null);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleEditSalesDetail = (detail: SalesDetailWithProduct) => {
    setCurrentSalesDetail(detail);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDeleteSalesDetail = (detail: SalesDetailWithProduct) => {
    setCurrentSalesDetail(detail);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveSalesDetail = async (data: SalesDetailFormValues) => {
    if (!transno) return;

    try {
      if (isEditing && currentSalesDetail) {
        // Update existing sales detail
        const { error } = await supabase
          .from('salesdetail')
          .update({
            quantity: data.quantity
          })
          .eq('transno', transno)
          .eq('prodcode', currentSalesDetail.prodcode);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Sales detail updated successfully.",
        });
      } else {
        // Check if product already exists in this transaction
        const existing = salesDetails.find(detail => detail.prodcode === data.prodcode);
        if (existing) {
          toast({
            title: "Error",
            description: "This product is already in the transaction. Edit it instead.",
            variant: "destructive",
          });
          setIsDialogOpen(false);
          return;
        }

        // Add new sales detail
        const { error } = await supabase
          .from('salesdetail')
          .insert({
            transno,
            prodcode: data.prodcode,
            quantity: data.quantity
          });

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Sales detail added successfully.",
        });
      }

      // Refresh sales details
      const { data: refreshedData, error: refreshError } = await supabase
        .from('salesdetail')
        .select(`
          *,
          product:prodcode(*)
        `)
        .eq('transno', transno);
        
      if (refreshError) throw refreshError;
      
      // Get unit prices for refreshed data
      const detailsWithPrices = await Promise.all((refreshedData || []).map(async (detail) => {
        // Get the latest price before or on the sales date
        const { data: priceData } = await supabase
          .from('pricehist')
          .select('unitprice')
          .eq('prodcode', detail.prodcode)
          .lte('effdate', sale?.salesdate || new Date().toISOString())
          .order('effdate', { ascending: false })
          .limit(1);
          
        return {
          ...detail,
          unitprice: priceData && priceData.length > 0 ? priceData[0].unitprice : 0
        };
      }));
      
      setSalesDetails(detailsWithPrices as SalesDetailWithProduct[]);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving sales detail:', error);
      toast({
        title: "Error",
        description: "Failed to save sales detail.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!currentSalesDetail || !transno) return;

    try {
      const { error } = await supabase
        .from('salesdetail')
        .delete()
        .eq('transno', transno)
        .eq('prodcode', currentSalesDetail.prodcode);

      if (error) throw error;
      
      // Remove from local state
      setSalesDetails(salesDetails.filter(
        detail => !(detail.transno === transno && detail.prodcode === currentSalesDetail.prodcode)
      ));
      
      toast({
        title: "Success",
        description: "Sales detail deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting sales detail:', error);
      toast({
        title: "Error",
        description: "Failed to delete sales detail.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setCurrentSalesDetail(null);
    }
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

            {/* Sales Details - Read-only view */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sales Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableCaption>List of items in this transaction</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Price per Unit</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesDetails.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">No sales details found.</TableCell>
                      </TableRow>
                    ) : (
                      salesDetails.map((detail) => {
                        const unitPrice = detail.unitprice || 0;
                        const quantity = detail.quantity || 0;
                        const amount = unitPrice * quantity;
                        
                        return (
                          <TableRow key={`${detail.transno}-${detail.prodcode}`}>
                            <TableCell>{detail.prodcode}</TableCell>
                            <TableCell>{detail.product?.description || 'N/A'}</TableCell>
                            <TableCell>${unitPrice.toFixed(2)}</TableCell>
                            <TableCell>{quantity}</TableCell>
                            <TableCell>{detail.product?.unit || 'N/A'}</TableCell>
                            <TableCell>${amount.toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                    <TableRow>
                      <TableCell colSpan={5} className="text-right font-bold">Total:</TableCell>
                      <TableCell className="font-bold">${calculateTotalAmount().toFixed(2)}</TableCell>
                    </TableRow>
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

      {/* Add/Edit Sales Detail Dialog */}
      <SalesDetailDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveSalesDetail}
        salesDetail={currentSalesDetail}
        isEditing={isEditing}
        products={products}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SaleDetailsPage;
