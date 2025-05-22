
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/sales/StatusBadge";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/components/sales/utils/formatters";
import { Customer } from "@/components/customers/CustomerService";

const CustomerDetailsPage = () => {
  const { custno } = useParams<{ custno: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [stampInfo, setStampInfo] = useState<string>("");

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (!custno) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('customer')
          .select('*')
          .eq('custno', custno)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setCustomer(data as Customer);
          // Get stamp info after we have the customer data
          const stampText = await formatModifierInfo(data);
          setStampInfo(stampText);
        }
      } catch (error) {
        console.error('Error fetching customer details:', error);
        toast({
          title: "Error",
          description: "Failed to load customer details.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomerDetails();
  }, [custno]);
  
  const handleGoBack = () => {
    navigate(-1);
  };
  
  // Function to get record status
  const getRecordStatus = (record: any) => {
    if (record.deleted_at) return 'Deleted';
    
    // Check if it was previously deleted and then restored
    if (record.modified_at && !record.deleted_at && 
        record.modified_by !== null && record.modified_by !== record.created_by) {
      return 'Restored';
    }
    
    if (record.modified_by !== null && record.modified_at !== null) {
      return 'Edited';
    }
    
    return 'Added';
  };

  // Function to format modifier info
  const formatModifierInfo = async (record: any): Promise<string> => {
    if (!record) return '';
    
    // Get user info for the modifier
    const getUserInfo = async (userId: string): Promise<string> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          const { first_name, last_name } = data;
          return first_name && last_name ? `${first_name} ${last_name}` : 
                 first_name || last_name || userId;
        }
        return userId;
      } catch (error) {
        console.error('Error fetching user info:', error);
        return userId;
      }
    };
    
    const formatStamp = async (userId: string | null, dateStr: string | null): Promise<string> => {
      if (!userId || !dateStr) return '';
      
      try {
        const name = await getUserInfo(userId);
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        
        // Format date as DD/MM/YYYY HH:MM:SS
        const formatted = date.toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        return `${name} ${formatted}`;
      } catch (error) {
        console.error('Error formatting stamp:', error);
        return '';
      }
    };
    
    // Use modified info if available, otherwise use created info
    if (record.modified_by && record.modified_at) {
      return formatStamp(record.modified_by, record.modified_at);
    } else if (record.created_by && record.created_at) {
      return formatStamp(record.created_by, record.created_at);
    }
    
    return '';
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
        
        <h1 className="text-2xl font-bold mb-6">Customer Details</h1>
        
        {loading ? (
          <div>Loading customer details...</div>
        ) : customer ? (
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Customer Information</CardTitle>
                  <StatusBadge status={getRecordStatus(customer)} />
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Number</dt>
                    <dd className="mt-1 text-lg">{customer.custno}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
                    <dd className="mt-1 text-lg">{customer.custname || 'N/A'}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</dt>
                    <dd className="mt-1 text-lg">{customer.address || 'N/A'}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Terms</dt>
                    <dd className="mt-1 text-lg">{customer.payterm || 'N/A'}</dd>
                  </div>
                </dl>
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
                    <dd className="mt-1 text-lg">{customer.created_at ? formatDate(customer.created_at) : 'N/A'}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Modified At</dt>
                    <dd className="mt-1 text-lg">{customer.modified_at ? formatDate(customer.modified_at) : 'N/A'}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Modification</dt>
                    <dd className="mt-1 text-lg whitespace-pre-line text-sm">{stampInfo}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center p-8">
            <h2 className="text-xl font-semibold mb-2">Customer not found</h2>
            <p className="text-gray-500 dark:text-gray-400">The customer you're looking for does not exist or has been deleted.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CustomerDetailsPage;
