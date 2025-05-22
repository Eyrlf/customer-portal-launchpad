
import { formatDateByUserPreference, formatDateOnlyByUserPreference } from "@/utils/dateFormatter";
import { SalesRecord } from "../types";
import { format } from "date-fns";

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  return formatDateOnlyByUserPreference(dateString);
};

export const formatModifierInfo = (record: SalesRecord): string => {
  // Format date and time in the required format (NAME DD/MM/YYYY exact time)
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
