
import { TableCell, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { CustomerActions } from "./CustomerActions";
import { StatusBadge } from "../sales/StatusBadge";
import { getCustomerStatus } from "./CustomerService";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface Customer {
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

interface CustomerTableRowProps {
  customer: Customer;
  showDeleted: boolean;
  isAdmin: boolean;
  canEditCustomer: boolean;
  canDeleteCustomer: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onRestore: (customer: Customer) => void;
}

export function CustomerTableRow({
  customer,
  showDeleted,
  isAdmin,
  canEditCustomer,
  canDeleteCustomer,
  onEdit,
  onDelete,
  onRestore
}: CustomerTableRowProps) {
  // Priority is given to the 'restore' action if present
  const status = getCustomerStatus(customer);
  const [modifierName, setModifierName] = useState('');
  const [creatorName, setCreatorName] = useState('');

  useEffect(() => {
    // Fetch user names when the component mounts or customer changes
    const fetchUserNames = async () => {
      try {
        // Fetch modifier name if exists
        if (customer.modified_by) {
          const { data: modifierData, error: modifierError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', customer.modified_by)
            .single();
          
          if (!modifierError && modifierData) {
            const firstName = modifierData.first_name || '';
            const lastName = modifierData.last_name || '';
            setModifierName(`${firstName} ${lastName}`.trim() || 'Unknown User');
          }
        }
        
        // Fetch creator name if exists
        if (customer.created_by) {
          const { data: creatorData, error: creatorError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', customer.created_by)
            .single();
          
          if (!creatorError && creatorData) {
            const firstName = creatorData.first_name || '';
            const lastName = creatorData.last_name || '';
            setCreatorName(`${firstName} ${lastName}`.trim() || 'Unknown User');
          }
        }
      } catch (error) {
        console.error("Error fetching user names:", error);
      }
    };
    
    fetchUserNames();
  }, [customer.modified_by, customer.created_by]);

  // Format date and time in the required format
  const formatStampDateTime = (dateString: string | null | undefined, name: string | null | undefined): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      const formattedDate = format(date, 'dd/MM/yyyy HH:mm:ss');
      return name ? `${name} ${formattedDate}` : formattedDate;
    } catch (e) {
      console.error("Error formatting date:", e);
      return '';
    }
  };

  // Generate stamp information using actual user names
  const getStampInfo = (customer: Customer): string => {
    if (customer.modified_by && customer.modified_at) {
      return formatStampDateTime(customer.modified_at, modifierName);
    }
    
    if (customer.created_by && customer.created_at) {
      return formatStampDateTime(customer.created_at, creatorName);
    }
    
    return '';
  };

  return (
    <TableRow className={showDeleted ? "bg-gray-50 dark:bg-gray-700 dark:border-gray-600" : ""}>
      <TableCell>{customer.custno}</TableCell>
      <TableCell>
        {!showDeleted ? (
          <Link 
            to={`/dashboard/customers/${customer.custno}`}
            className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          >
            {customer.custname || 'N/A'}
          </Link>
        ) : (
          customer.custname || 'N/A'
        )}
      </TableCell>
      <TableCell>{customer.address || 'N/A'}</TableCell>
      <TableCell>{customer.payterm || 'N/A'}</TableCell>
      
      {/* Only show Status column for admin users */}
      {isAdmin && (
        <TableCell>
          <StatusBadge status={status} />
        </TableCell>
      )}
      
      {/* Only show Stamp column for admin users */}
      {isAdmin && (
        <TableCell className="text-xs text-gray-500 dark:text-gray-300">
          {getStampInfo(customer)}
        </TableCell>
      )}
      
      <TableCell>
        <CustomerActions
          customer={customer}
          showDeleted={showDeleted}
          isAdmin={isAdmin}
          canEditCustomer={canEditCustomer}
          canDeleteCustomer={canDeleteCustomer}
          onEdit={onEdit}
          onDelete={onDelete}
          onRestore={onRestore}
        />
      </TableCell>
    </TableRow>
  );
}
