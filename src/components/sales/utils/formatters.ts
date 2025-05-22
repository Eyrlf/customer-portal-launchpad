
import { formatDateByUserPreference, formatDateOnlyByUserPreference } from "@/utils/dateFormatter";
import { SalesRecord } from "../types";
import { format } from "date-fns";

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  return formatDateOnlyByUserPreference(dateString);
};

export const formatModifierInfo = (record: SalesRecord): string => {
  // Format date and time in the required format (NAME DD/MM/YYYY exact time)
  const formatStampDateTime = (dateString: string | null | undefined, userId: string | null | undefined): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // Format the date in DD/MM/YYYY HH:mm:ss format
      const formattedDate = format(date, 'dd/MM/yyyy HH:mm:ss');
      
      // If userId is provided, try to get the user's name
      let userName = '';
      if (userId && record.modifier) {
        const firstName = record.modifier.user_metadata?.first_name;
        const lastName = record.modifier.user_metadata?.last_name;
        
        if (firstName && lastName) {
          userName = `${firstName} ${lastName}`;
        } else if (firstName) {
          userName = firstName;
        } else if (lastName) {
          userName = lastName;
        }
      }
      
      return userName ? `${userName} ${formattedDate}` : formattedDate;
    } catch (e) {
      console.error("Error formatting date:", e);
      return '';
    }
  };
  
  // Return empty string if no modification information is available
  if (!record.modified_by && !record.modified_at && !record.created_by && !record.created_at) {
    return '';
  }
  
  // Prioritize modification information over creation information
  if (record.modified_by && record.modified_at) {
    return formatStampDateTime(record.modified_at, record.modified_by);
  }
  
  // Fall back to creation information
  if (record.created_by && record.created_at) {
    return formatStampDateTime(record.created_at, record.created_by);
  }
  
  return '';
};
