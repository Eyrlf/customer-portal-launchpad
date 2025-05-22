
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/sales/StatusBadge";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { formatDate, formatModifierInfo } from "@/components/sales/utils/formatters";
import { SalesRecord } from "@/components/sales/types";
import { Link } from "react-router-dom";

const SaleDetailsPage = () => {
  const { transno } = useParams<{ transno: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sale, setSale] = useState<SalesRecord | null>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaleDetails = async () => {
      if (!transno) return;
      
      setLoading(true);
      try {
        // Fetch sale details
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .select(`
            *,
            customer:custno(custno, custname, address, payterm),
            employee:empno(empno, firstname, lastname)
          `)
          .eq('transno', transno)
          .single();
        
        if (saleError) throw saleError;
        
        if (saleData) {
          // For each sale, fetch the modifier (user) data
          let modifierData = null;
          
          if (saleData.modified_by) {
            // Fetch the user data from the profiles table
            const { data: userData, error: userError } = await supabase
              .from('profiles')
              .select('id, first_name, last_name')
              .eq('id', saleData.modified_by)
              .single();
            
            if (!userError && userData) {
              modifierData = {
                id: userData.id,
                user_metadata: {
                  first_name: userData.first_name,
                  last_name: userData.last_name
                }
              };
            }
          }
          
          // Fetch sale items
          const { data: itemsData, error: itemsError } = await supabase
            .from('salesdetail')
            .select(`
              *,
              product:prodcode(prodcode, description, unit)
            `)
            .eq('transno', transno);
            
          if (itemsError) throw itemsError;
          
          // Fetch prices for each item
          const itemsWithPrices = await Promise.all((itemsData || []).map(async (item) => {
            const { data: priceData, error: priceError } = await supabase
              .from('pricehist')
              .select('unitprice')
              .eq('prodcode', item.prodcode)
              .order('effdate', { ascending: false })
              .limit(1);
              
            const unitPrice = !priceError && priceData && priceData.length > 0 ? 
              priceData[0].unitprice : 0;
              
            return {
              ...item,
              unitprice: unitPrice,
              subtotal: unitPrice * (item.quantity || 0)
            };
          }));
          
          // Calculate total amount
          const total = itemsWithPrices.reduce((sum, item) => sum + (item.subtotal || 0), 0);
          
          // Create a proper SalesRecord
          const enhancedSale = {
            ...saleData,
            modifier: modifierData,
            total_amount: total,
          } as SalesRecord;
          
          setSale(enhancedSale);
          setSaleItems(itemsWithPrices);
        }
      } catch (error) {
        console.error('Error fetching sale details:', error);
        toast({
          title: "Error",
          description: "Failed to load sale details.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSaleDetails();
  }, [transno]);
  
  const handleGoBack = () => {
    navigate(-1);
  };
  
  // Function to get record status
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

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={handleGoBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        
        <h1 className="text-2xl font-bold mb-6">Sale Details</h1>
        
        {loading ? (
          <div>Loading sale details...</div>
        ) : sale ? (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Transaction Information</CardTitle>
                  <StatusBadge status={getRecordStatus(sale)} />
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Transaction Number</dt>
                    <dd className="mt-1 text-lg">{sale.transno}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Transaction Date</dt>
                    <dd className="mt-1 text-lg">{formatDate(sale.salesdate)}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer</dt>
                    <dd className="mt-1 text-lg">
                      {sale.customer ? (
                        <Link 
                          to={`/dashboard/customers/${sale.customer.custno}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {sale.customer.custname || sale.customer.custno}
                        </Link>
                      ) : (
                        'N/A'
                      )}
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</dt>
                    <dd className="mt-1 text-lg font-semibold">${sale.total_amount?.toFixed(2) || '0.00'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Sale Items</CardTitle>
              </CardHeader>
              <CardContent>
                {saleItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Product Code</th>
                          <th className="text-left py-2">Description</th>
                          <th className="text-right py-2">Quantity</th>
                          <th className="text-right py-2">Unit Price</th>
                          <th className="text-right py-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {saleItems.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2">{item.prodcode}</td>
                            <td className="py-2">{item.product?.description || 'N/A'}</td>
                            <td className="text-right py-2">{item.quantity}</td>
                            <td className="text-right py-2">${item.unitprice?.toFixed(2) || '0.00'}</td>
                            <td className="text-right py-2">${item.subtotal?.toFixed(2) || '0.00'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} className="text-right py-2 font-bold">Total:</td>
                          <td className="text-right py-2 font-bold">${sale.total_amount?.toFixed(2) || '0.00'}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-4">No items found for this sale.</div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Audit Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</dt>
                    <dd className="mt-1 text-lg">{formatDate(sale.created_at)}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Modified At</dt>
                    <dd className="mt-1 text-lg">{sale.modified_at ? formatDate(sale.modified_at) : 'N/A'}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Modification</dt>
                    <dd className="mt-1 text-lg whitespace-pre-line text-sm">{formatModifierInfo(sale)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold mb-2">Sale not found</h2>
            <p className="text-gray-500 dark:text-gray-400">The sale you're looking for does not exist or has been deleted.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SaleDetailsPage;
