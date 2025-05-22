import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface Customer {
  custno: string;
  custname: string | null;
  address: string | null;
  payterm: string | null;
  deleted_at: string | null;
  modified_at?: string | null;
  modified_by?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  action?: string; // Used to track restore action
}

export interface CustomerFormData {
  custno: string;
  custname: string;
  address: string;
  payterm: string;
}

// Function to get customer status based on record attributes
export const getCustomerStatus = (customer: Customer): 'Added' | 'Edited' | 'Deleted' | 'Restored' => {
  // If customer was explicitly deleted and then restored
  if (customer.action === 'restore') {
    return 'Restored';
  }
  
  // If customer is currently deleted
  if (customer.deleted_at) {
    return 'Deleted';
  }
  
  // If customer was modified after creation
  if (customer.modified_at && customer.modified_by) {
    return 'Edited';
  }
  
  // Default status for new customers
  return 'Added';
};

// Fetch all active customers
export const fetchCustomers = async (): Promise<Customer[]> => {
  try {
    const { data, error } = await supabase
      .from('customer')
      .select('*')
      .is('deleted_at', null)
      .order('custno', { ascending: true });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
};

// Fetch all deleted customers
export const fetchDeletedCustomers = async (): Promise<Customer[]> => {
  try {
    const { data, error } = await supabase
      .from('customer')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('custno', { ascending: true });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching deleted customers:', error);
    throw error;
  }
};

// Generate a new customer number
export const generateNewCustomerNumber = async (): Promise<string> => {
  try {
    // Get the highest customer number
    const { data, error } = await supabase
      .from('customer')
      .select('custno')
      .order('custno', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      const lastCustNo = data[0].custno;
      // If the customer number follows a pattern like 'C0001', extract the number and increment
      if (/^C\d+$/.test(lastCustNo)) {
        const numPart = parseInt(lastCustNo.substring(1), 10);
        return `C${(numPart + 1).toString().padStart(4, '0')}`;
      }
      // If it's just a number
      if (/^\d+$/.test(lastCustNo)) {
        return (parseInt(lastCustNo, 10) + 1).toString().padStart(5, '0');
      }
    }
    
    // Default if no customers exist yet
    return 'C0001';
  } catch (error) {
    console.error('Error generating customer number:', error);
    throw error;
  }
};

// Validate customer form data
export const validateCustomerForm = (data: CustomerFormData): string[] => {
  const errors: string[] = [];
  
  if (!data.custno.trim()) {
    errors.push("Customer number is required");
  }
  
  if (!data.custname.trim()) {
    errors.push("Customer name is required");
  }
  
  return errors;
};

// Add a new customer to the database
export const createCustomer = async (data: CustomerFormData): Promise<{ success: boolean; message: string; custno?: string }> => {
  try {
    const currentUser = (await supabase.auth.getUser()).data.user;
    const userId = currentUser?.id || null;
    
    const { error } = await supabase
      .from('customer')
      .insert({
        custno: data.custno,
        custname: data.custname,
        address: data.address,
        payterm: data.payterm,
        created_by: userId,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      throw error;
    }
    
    return { success: true, message: "Customer added successfully", custno: data.custno };
  } catch (error: any) {
    console.error("Error adding customer:", error);
    return { success: false, message: error.message || "Failed to add customer" };
  }
};

// Update an existing customer
export const updateCustomer = async (custno: string, data: Partial<CustomerFormData>): Promise<{ success: boolean; message: string; }> => {
  try {
    const currentUser = (await supabase.auth.getUser()).data.user;
    const userId = currentUser?.id || null;
    
    const { error } = await supabase
      .from('customer')
      .update({
        custname: data.custname,
        address: data.address,
        payterm: data.payterm,
        modified_by: userId,
        modified_at: new Date().toISOString()
      })
      .eq('custno', custno);
    
    if (error) {
      throw error;
    }
    
    return { success: true, message: "Customer updated successfully" };
  } catch (error: any) {
    console.error("Error updating customer:", error);
    return { success: false, message: error.message || "Failed to update customer" };
  }
};

// Delete a customer
export const deleteCustomer = async (custno: string): Promise<{ success: boolean; message: string; }> => {
  try {
    const currentUser = (await supabase.auth.getUser()).data.user;
    const userId = currentUser?.id || null;
    
    const { error } = await supabase
      .from('customer')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId
      })
      .eq('custno', custno);
    
    if (error) {
      throw error;
    }
    
    // Log activity
    await supabase.rpc('log_activity', {
      action: 'delete',
      table_name: 'customer',
      record_id: custno,
      details: JSON.stringify({ custno, deleted_by: userId })
    });
    
    return { success: true, message: "Customer deleted successfully" };
  } catch (error: any) {
    console.error("Error deleting customer:", error);
    return { success: false, message: error.message || "Failed to delete customer" };
  }
};

// Restore a deleted customer
export const restoreCustomer = async (custno: string): Promise<{ success: boolean; message: string; }> => {
  try {
    const currentUser = (await supabase.auth.getUser()).data.user;
    const userId = currentUser?.id || null;
    
    const { error } = await supabase
      .from('customer')
      .update({
        deleted_at: null,
        deleted_by: null,
        modified_at: new Date().toISOString(),
        modified_by: userId
      })
      .eq('custno', custno);
    
    if (error) {
      throw error;
    }
    
    // Log activity
    await supabase.rpc('log_activity', {
      action: 'restore',
      table_name: 'customer',
      record_id: custno,
      details: JSON.stringify({ custno, restored_by: userId })
    });
    
    return { success: true, message: "Customer restored successfully" };
  } catch (error: any) {
    console.error("Error restoring customer:", error);
    return { success: false, message: error.message || "Failed to restore customer" };
  }
};

// Add these exports to fix the missing export issue
export { fetchCustomers, fetchDeletedCustomers, generateNewCustomerNumber, validateCustomerForm };
