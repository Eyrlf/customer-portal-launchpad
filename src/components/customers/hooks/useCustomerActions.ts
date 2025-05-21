
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  Customer, 
  generateNewCustomerNumber,
  createCustomer, 
  updateCustomer,
  deleteCustomer,
  restoreCustomer
} from "../CustomerService";
import { CustomerFormValues } from "../CustomerForm";

interface UseCustomerActionsProps {
  isAdmin: boolean;
  canAddCustomer: boolean;
  canEditCustomer: boolean;
  canDeleteCustomer: boolean;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  removeCustomerFromActive: (custno: string) => void;
  removeCustomerFromDeleted: (custno: string) => void;
  loadCustomersData: () => Promise<void>;
}

export function useCustomerActions({
  isAdmin,
  canAddCustomer,
  canEditCustomer,
  canDeleteCustomer,
  addCustomer,
  updateCustomer: updateCustomerInList,
  removeCustomerFromActive,
  removeCustomerFromDeleted,
  loadCustomersData
}: UseCustomerActionsProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formDefaults, setFormDefaults] = useState<CustomerFormValues>({
    custno: "",
    custname: "",
    address: "",
    payterm: "COD",
  });

  const { toast } = useToast();

  const prepareNewCustomerForm = async () => {
    if (!canAddCustomer) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to add customers.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const newCustNo = await generateNewCustomerNumber();
      setFormDefaults({
        custno: newCustNo,
        custname: "",
        address: "",
        payterm: "COD",
      });
      setIsEditing(false);
      setSelectedCustomer(null);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error generating customer number:', error);
      toast({
        title: "Error",
        description: "Failed to prepare new customer form.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    if (!canEditCustomer) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit customers.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedCustomer(customer);
    setIsEditing(true);
    setFormDefaults({
      custno: customer.custno,
      custname: customer.custname || "",
      address: customer.address || "",
      payterm: customer.payterm || "COD",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (customer: Customer) => {
    if (!canDeleteCustomer) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete customers.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await deleteCustomer(customer);
      
      toast({
        title: "Customer Deleted",
        description: `Customer ${customer.custname} has been deleted.`,
      });
      
      loadCustomersData();
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
      const result = await restoreCustomer(customer);
      
      toast({
        title: "Customer Restored",
        description: `Customer ${customer.custname} has been restored.`,
      });
      
      // Create a restored customer object with the proper action flag
      const restoredCustomer = {
        ...customer,
        deleted_at: null,
        action: 'restore'  // This ensures the status shows as "Restored"
      };
      
      // Add to active customers list with the 'restore' action flag
      addCustomer(restoredCustomer);
      
      // Remove from deleted customers list
      removeCustomerFromDeleted(customer.custno);
      
    } catch (error) {
      console.error('Error restoring customer:', error);
      toast({
        title: "Error",
        description: "Failed to restore customer.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (values: CustomerFormValues) => {
    try {
      if (isEditing && selectedCustomer) {
        if (!canEditCustomer) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to edit customers.",
            variant: "destructive",
          });
          return;
        }
        
        // Update existing customer
        await updateCustomer(selectedCustomer.custno, {
          custname: values.custname,
          address: values.address,
          payterm: values.payterm,
        });
        
        // Update the customer in the state with 'Edited' status
        const updatedCustomer = { 
          ...selectedCustomer,
          custname: values.custname, 
          address: values.address, 
          payterm: values.payterm, 
          modified_at: new Date().toISOString() // Add modified timestamp for status tracking
        };
        
        updateCustomerInList(updatedCustomer);
        
        toast({
          title: "Customer Updated",
          description: `Customer ${values.custname} has been updated successfully.`,
        });
      } else {
        if (!canAddCustomer) {
          toast({
            title: "Permission Denied",
            description: "You don't have permission to add customers.",
            variant: "destructive",
          });
          return;
        }
        
        // Create new customer
        await createCustomer(values);
        
        // Add the new customer to the state
        const newCustomer = {
          custno: values.custno,
          custname: values.custname,
          address: values.address,
          payterm: values.payterm,
          deleted_at: null,
          action: 'add' // Mark as newly added
        };
        
        addCustomer(newCustomer);
        
        toast({
          title: "Customer Created",
          description: `Customer ${values.custname} has been created successfully.`,
        });
      }
      
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Error submitting customer:', error);
      
      if (error.code === '23505') {
        toast({
          title: "Error",
          description: "Customer number already exists.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to save customer data.",
        variant: "destructive",
      });
    }
  };

  return {
    selectedCustomer,
    isEditing,
    dialogOpen,
    formDefaults,
    setDialogOpen,
    prepareNewCustomerForm,
    handleEdit,
    handleDelete,
    handleRestore,
    handleSubmit
  };
}
