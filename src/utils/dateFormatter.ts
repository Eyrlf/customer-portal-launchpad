
import { format, parse } from "date-fns";

type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";

export const getUserDateFormat = (): DateFormat => {
  if (!localStorage) return "MM/DD/YYYY"; // Default format
  
  try {
    const userId = JSON.parse(localStorage.getItem("sb-supabase-auth-token") || "[]")?.[0]?.user?.id;
    if (!userId) return "MM/DD/YYYY";
    
    const userSettings = localStorage.getItem(`user_settings_${userId}`);
    if (!userSettings) return "MM/DD/YYYY";
    
    const { dateFormat } = JSON.parse(userSettings);
    return dateFormat || "MM/DD/YYYY";
  } catch (e) {
    console.error("Error reading date format from settings:", e);
    return "MM/DD/YYYY";
  }
};

export const formatDateByUserPreference = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  
  try {
    const dateFormat = getUserDateFormat();
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString.toString();
    }
    
    // Convert to format patterns that date-fns understands
    const formatPattern = 
      dateFormat === "MM/DD/YYYY" ? "MM/dd/yyyy h:mm a" :
      dateFormat === "DD/MM/YYYY" ? "dd/MM/yyyy HH:mm" :
      "yyyy-MM-dd HH:mm";
    
    return format(date, formatPattern);
  } catch (e) {
    console.error("Error formatting date:", e, dateString);
    return dateString?.toString() || "";
  }
};

// Format date without time
export const formatDateOnlyByUserPreference = (dateString: string | null | undefined): string => {
  if (!dateString) return "";
  
  try {
    const dateFormat = getUserDateFormat();
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return dateString.toString();
    }
    
    // Convert to format patterns that date-fns understands
    const formatPattern = 
      dateFormat === "MM/DD/YYYY" ? "MM/dd/yyyy" :
      dateFormat === "DD/MM/YYYY" ? "dd/MM/yyyy" :
      "yyyy-MM-dd";
    
    return format(date, formatPattern);
  } catch (e) {
    console.error("Error formatting date:", e, dateString);
    return dateString?.toString() || "";
  }
};

// Helper to parse a date string in any of the supported formats
export const parseUserFormattedDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  try {
    const dateFormat = getUserDateFormat();
    
    // Convert to format patterns that date-fns understands
    const formatPattern = 
      dateFormat === "MM/DD/YYYY" ? "MM/dd/yyyy" :
      dateFormat === "DD/MM/YYYY" ? "dd/MM/yyyy" :
      "yyyy-MM-dd";
    
    return parse(dateString, formatPattern, new Date());
  } catch (e) {
    console.error("Error parsing date:", e, dateString);
    return null;
  }
};
