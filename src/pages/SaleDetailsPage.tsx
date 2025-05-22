
// Within the getRecordStatus function in SaleDetailsPage.tsx, update to avoid using deleted_by:

const getRecordStatus = (sale: SalesRecord) => {
  if (sale.deleted_at) return 'Deleted';
  
  // Check if it was previously deleted and then restored
  if (sale.modified_at && !sale.deleted_at && 
      sale.modified_by !== null && sale.modified_by !== sale.created_by) {
    return 'Restored';
  }
  
  if (sale.modified_by !== null && sale.modified_at !== null) {
    return 'Edited';
  }
  
  return 'Added';
};
