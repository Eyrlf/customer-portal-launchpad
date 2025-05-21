
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  Customer, 
  fetchCustomers, 
  fetchDeletedCustomers,
  getCustomerStatus
} from "../CustomerService";

export function useCustomersData(showDeleted: boolean, isAdmin: boolean) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deletedCustomers, setDeletedCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCustomersData();
  }, [showDeleted, isAdmin]);

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

  const addCustomer = (customer: Customer) => {
    setCustomers(prev => [customer, ...prev]);
  };

  const updateCustomer = (updatedCustomer: Customer) => {
    setCustomers(prev => prev.map(cust => 
      cust.custno === updatedCustomer.custno ? updatedCustomer : cust
    ));
  };

  const removeCustomerFromActive = (custno: string) => {
    setCustomers(prev => prev.filter(c => c.custno !== custno));
  };

  const removeCustomerFromDeleted = (custno: string) => {
    setDeletedCustomers(prev => prev.filter(c => c.custno !== custno));
  };

  return {
    customers,
    deletedCustomers,
    loading,
    addCustomer,
    updateCustomer,
    removeCustomerFromActive,
    removeCustomerFromDeleted,
    loadCustomersData
  };
}
