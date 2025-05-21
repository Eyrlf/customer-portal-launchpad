
import { formatDateByUserPreference } from "@/utils/dateFormatter";
import { SalesRecord } from "../types";

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  return formatDateByUserPreference(dateString);
};

export const formatModifierInfo = (record: SalesRecord): string => {
  let info = "";
  
  if (record.deleted_at) {
    info = `Deleted:\n${formatDate(record.deleted_at)}`;
    if (record.deleted_by) {
      info += ` by ${record.deleted_by}`;
    }
    return info;
  }
  
  if (record.created_at) {
    info = `Created:\n${formatDate(record.created_at)}`;
    if (record.created_by) {
      info += ` by ${record.created_by}`;
    }
  }
  
  if (record.modified_at) {
    info += info ? "\n\n" : "";
    info += `Modified:\n${formatDate(record.modified_at)}`;
    if (record.modified_by) {
      if (record.modifier) {
        const firstName = record.modifier.user_metadata?.first_name || "";
        const lastName = record.modifier.user_metadata?.last_name || "";
        if (firstName || lastName) {
          info += ` by ${firstName} ${lastName}`;
        } else {
          info += ` by ${record.modified_by}`;
        }
      } else {
        info += ` by ${record.modified_by}`;
      }
    }
  }
  
  return info || "N/A";
};
