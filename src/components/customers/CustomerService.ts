
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
  if (customer.action === 'restore' || (customer.modified_at && !customer.deleted_at &&
    customer.modified_by !== null && customer.modified_by !== customer.created_by)) {
    return 'Restored';
  }
  
  if (customer.deleted_at) {
    return 'Deleted';
  }
  
  if (customer.modified_at && customer.modified_by) {
    return 'Edited';
  }
  
  return 'Added';
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
export const addCustomer = async (data: CustomerFormData): Promise<{ success: boolean; message: string; custno?: string }> => {
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
export const updateCustomer = async (data: CustomerFormData): Promise<{ success: boolean; message: string; }> => {
  try {
    const currentUser = (await supabase.auth.getUser()).data.user;
    const userId = currentUser?.id || null;
    
    // Synchronous function to get user name for the stamp
    const getUserName = (userId: string): string => {
      return userId; // Return user ID as a placeholder, will be replaced with real name in UI
    };
    
    const { error } = await supabase
      .from('customer')
      .update({
        custname: data.custname,
        address: data.address,
        payterm: data.payterm,
        modified_by: userId,
        modified_at: new Date().toISOString()
      })
      .eq('custno', data.custno);
    
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
