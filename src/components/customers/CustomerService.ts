
import { supabase } from "@/integrations/supabase/client";
import { CustomerFormValues } from "./CustomerForm";

export interface Customer {
  custno: string;
  custname: string | null;
  address: string | null;
  payterm: string | null;
  deleted_at: string | null;
  modified_at?: string | null;
  modified_by?: string | null;
}

export async function fetchCustomers() {
  const { data, error } = await supabase
    .from('customer')
    .select('*')
    .is('deleted_at', null);
  
  if (error) throw error;
  return data || [];
}

export async function fetchDeletedCustomers() {
  const { data, error } = await supabase
    .from('customer')
    .select('*')
    .not('deleted_at', 'is', null);
  
  if (error) throw error;
  return data || [];
}

export async function generateNewCustomerNumber() {
  const { data, error } = await supabase
    .from('customer')
    .select('custno')
    .order('custno', { ascending: false })
    .limit(1);
  
  if (error) throw error;
  
  let nextNumber = "C0001"; // Default starting number
  
  if (data && data.length > 0) {
    const lastNumber = data[0].custno;
    // Extract the numeric part and increment
    if (lastNumber.startsWith('C')) {
      const numPart = parseInt(lastNumber.substring(1), 10);
      if (!isNaN(numPart)) {
        nextNumber = `C${String(numPart + 1).padStart(4, '0')}`;
      }
    }
  }
  
  return nextNumber;
}

export async function createCustomer(values: CustomerFormValues) {
  try {
    // Check field lengths to ensure they don't exceed database constraints
    if (values.custname && values.custname.length > 20) {
      values.custname = values.custname.substring(0, 20);
    }
    
    if (values.address && values.address.length > 50) {
      values.address = values.address.substring(0, 50);
    }
    
    const { data, error } = await supabase
      .from('customer')
      .insert({
        custno: values.custno,
        custname: values.custname,
        address: values.address,
        payterm: values.payterm || 'COD', // Ensure payterm has a default value
      });
    
    if (error) throw error;
    
    // Log activity
    await supabase.rpc('log_activity', {
      action: 'insert',
      table_name: 'customer',
      record_id: values.custno,
      details: JSON.stringify(values),
    });
    
    return data;
  } catch (error) {
    console.error("Error in createCustomer:", error);
    throw error;
  }
}

export async function updateCustomer(custno: string, values: Omit<CustomerFormValues, 'custno'>) {
  try {
    // Check field lengths to ensure they don't exceed database constraints
    if (values.custname && values.custname.length > 20) {
      values.custname = values.custname.substring(0, 20);
    }
    
    if (values.address && values.address.length > 50) {
      values.address = values.address.substring(0, 50);
    }
    
    const { data, error } = await supabase
      .from('customer')
      .update({
        custname: values.custname,
        address: values.address,
        payterm: values.payterm || 'COD',
      })
      .eq('custno', custno);
    
    if (error) throw error;
    
    // Log activity
    await supabase.rpc('log_activity', {
      action: 'update',
      table_name: 'customer',
      record_id: custno,
      details: JSON.stringify({ custno, ...values }),
    });
    
    return data;
  } catch (error) {
    console.error("Error in updateCustomer:", error);
    throw error;
  }
}

export async function deleteCustomer(customer: Customer) {
  try {
    const { data, error } = await supabase
      .from('customer')
      .update({ deleted_at: new Date().toISOString() })
      .eq('custno', customer.custno);
    
    if (error) throw error;
    
    // Log activity
    await supabase.rpc('log_activity', {
      action: 'delete',
      table_name: 'customer',
      record_id: customer.custno,
      details: JSON.stringify(customer),
    });
    
    return data;
  } catch (error) {
    console.error("Error in deleteCustomer:", error);
    throw error;
  }
}

export async function restoreCustomer(customer: Customer) {
  try {
    // Check if customer exists
    const { data: checkCustomer, error: checkError } = await supabase
      .from('customer')
      .select('custno')
      .eq('custno', customer.custno)
      .single();
      
    if (checkError) {
      console.error("Error checking customer existence:", checkError);
      throw new Error("Customer not found");
    }
    
    // Simple, focused update with only necessary fields
    const { error } = await supabase
      .from('customer')
      .update({ 
        deleted_at: null 
      })
      .eq('custno', customer.custno);
    
    if (error) {
      console.error("Supabase error in restoreCustomer:", error);
      throw error;
    }
    
    // Log activity for the restore operation
    await supabase.rpc('log_activity', {
      action: 'restore',
      table_name: 'customer',
      record_id: customer.custno,
      details: JSON.stringify(customer),
    });
    
    // Manual update of the in-memory customer object to reflect changes
    const updatedCustomer = {
      ...customer,
      deleted_at: null
    };
    
    return { success: true, customer: updatedCustomer };
  } catch (error) {
    console.error("Error in restoreCustomer:", error);
    throw error;
  }
}

export function getCustomerStatus(customer: Customer) {
  if (customer.deleted_at) return 'Deleted';
  
  if (customer.modified_by !== null && customer.modified_at !== null) {
    // For restored customers
    const { action } = customer as any; 
    if (action === 'restore') {
      return 'Restored';
    }
    return 'Edited';
  }
  
  return 'Added'; // Default status is 'Added'
}
