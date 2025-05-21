
import { format } from "date-fns";
import { SalesRecord } from "../types";

export const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'PP');
  } catch (e) {
    return 'Invalid date';
  }
};

export const formatModifierInfo = (sale: SalesRecord) => {
  if (!sale.modified_by || !sale.modified_at) return 'N/A';
  
  let name = 'Unknown User';
  // Check if modifier exists and is not an error
  if (sale.modifier && typeof sale.modifier === 'object' && !('error' in sale.modifier) && sale.modifier !== null) {
    if (sale.modifier.user_metadata?.first_name || sale.modifier.user_metadata?.last_name) {
      name = `${sale.modifier.user_metadata.first_name || ''} ${sale.modifier.user_metadata.last_name || ''}`.trim();
    } else if ('email' in sale.modifier) {
      name = sale.modifier.email || 'Unknown Email';
    }
  }

  try {
    const timestamp = format(new Date(sale.modified_at), 'dd-MM-yyyy HH:mm:ss');
    return `${name}\n${timestamp}`;
  } catch (e) {
    return `${name}\nUnknown date`;
  }
};
