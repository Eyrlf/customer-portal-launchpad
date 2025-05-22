
// Within the getRecordStatus function in CustomerDetailsPage.tsx, update to avoid using deleted_by:

const getRecordStatus = (record: any) => {
  if (record.deleted_at) return 'Deleted';
  
  // Check if it was previously deleted and then restored
  if (record.modified_at && !record.deleted_at && 
      record.modified_by !== null && record.modified_by !== record.created_by) {
    return 'Restored';
  }
  
  if (record.modified_by !== null && record.modified_at !== null) {
    return 'Edited';
  }
  
  return 'Added';
};
