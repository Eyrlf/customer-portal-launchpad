
import { formatDateByUserPreference, formatDateOnlyByUserPreference } from "@/utils/dateFormatter";
import { SalesRecord } from "../types";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  return formatDateOnlyByUserPreference(dateString);
};

export const formatModifierInfo = async (record: SalesRecord): Promise<string> => {
  // Format date and time in the required format (NAME DD/MM/YYYY exact time)
  const formatStampDateTime = async (dateString: string | null | undefined, userId: string | null | undefined): Promise<string> => {
    if (!dateString || !userId) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // Format the date in DD/MM/YYYY HH:mm:ss format
      const formattedDate = format(date, 'dd/MM/yyyy HH:mm:ss');
      
      // Get user name from profiles table
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();
        
      if (userError) {
        console.error("Error fetching user data:", userError);
        return formattedDate; // Fall back to just date if we can't get the user name
      }
      
      let userName = '';
      if (userData) {
        const firstName = userData.first_name;
        const lastName = userData.last_name;
        
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
    return await formatStampDateTime(record.modified_at, record.modified_by);
  }
  
  // Fall back to creation information
  if (record.created_by && record.created_at) {
    return await formatStampDateTime(record.created_at, record.created_by);
  }
  
  return '';
};

// Non-async version for components that can't use async directly
export const formatModifierInfoSync = (record: SalesRecord): string => {
  if (!record) return '';
  
  // Non-async function that doesn't fetch user data - just uses the data already in the record
  const formatStampDateTimeSync = (dateString: string | null | undefined, userName: string | null | undefined): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // Format the date in DD/MM/YYYY HH:mm:ss format
      const formattedDate = format(date, 'dd/MM/yyyy HH:mm:ss');
      
      return userName ? `${userName} ${formattedDate}` : formattedDate;
    } catch (e) {
      console.error("Error formatting date:", e);
      return '';
    }
  };
  
  // Get user name from record if available
  let modifierName = '';
  if (record.modifier) {
    const firstName = record.modifier.user_metadata?.first_name;
    const lastName = record.modifier.user_metadata?.last_name;
    
    if (firstName && lastName) {
      modifierName = `${firstName} ${lastName}`;
    } else if (firstName) {
      modifierName = firstName;
    } else if (lastName) {
      modifierName = lastName;
    }
  }
  
  // Return empty string if no modification information is available
  if (!record.modified_by && !record.modified_at && !record.created_by && !record.created_at) {
    return '';
  }
  
  // Prioritize modification information over creation information
  if (record.modified_at) {
    return formatStampDateTimeSync(record.modified_at, modifierName);
  }
  
  // Fall back to creation information
  if (record.created_at) {
    return formatStampDateTimeSync(record.created_at, modifierName);
  }
  
  return '';
};
