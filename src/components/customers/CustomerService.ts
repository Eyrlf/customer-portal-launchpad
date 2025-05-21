
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
  const { data, error } = await supabase
    .from('customer')
    .insert({
      custno: values.custno,
      custname: values.custname,
      address: values.address,
      payterm: values.payterm,
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
}

export async function updateCustomer(custno: string, values: Omit<CustomerFormValues, 'custno'>) {
  const { data, error } = await supabase
    .from('customer')
    .update({
      custname: values.custname,
      address: values.address,
      payterm: values.payterm,
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
}

export async function deleteCustomer(customer: Customer) {
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
}

export async function restoreCustomer(customer: Customer) {
  const { data, error } = await supabase
    .from('customer')
    .update({ deleted_at: null })
    .eq('custno', customer.custno);
  
  if (error) throw error;
  
  // Log activity
  await supabase.rpc('log_activity', {
    action: 'restore',
    table_name: 'customer',
    record_id: customer.custno,
    details: JSON.stringify(customer),
  });
  
  return data;
}

export function getCustomerStatus(customer: Customer) {
  if (customer.deleted_at) return 'Deleted';
  if (customer.modified_at && !customer.deleted_at) return 'Edited';
  if (customer.deleted_at === null && customer.modified_by === null && customer.modified_at === null) return 'Added';
  if (customer.deleted_at === null && customer.modified_by !== null) return 'Restored';
  return 'Added';
}
