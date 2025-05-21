
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CustomerDialog } from "./CustomerDialog";
import { CustomerTableContent } from "./CustomerTableContent";
import { CustomerFilters } from "./CustomerFilters";
import { CustomerTableActions } from "./CustomerTableActions";
import { useCustomersData } from "./hooks/useCustomersData";
import { useFilteredCustomers } from "./hooks/useFilteredCustomers";
import { useCustomerPermissions } from "./hooks/useCustomerPermissions";
import { useCustomerActions } from "./hooks/useCustomerActions";

interface CustomersTableProps {
  sortOrder?: "asc" | "desc";
}

export function CustomersTable({ sortOrder = "asc" }: CustomersTableProps) {
  const [showDeleted, setShowDeleted] = useState(false);
  const { isAdmin, user } = useAuth();
  
  // Custom hooks for data management
  const { 
    customers, 
    deletedCustomers, 
    loading, 
    addCustomer, 
    updateCustomer, 
    removeCustomerFromActive,
    removeCustomerFromDeleted,
    loadCustomersData 
  } = useCustomersData(showDeleted, isAdmin);

  // Custom hook for permissions
  const { 
    canAddCustomer, 
    canEditCustomer, 
    canDeleteCustomer 
  } = useCustomerPermissions(isAdmin, user?.id);

  // Custom hook for filtering and sorting
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    filteredCustomers,
    toggleSort
  } = useFilteredCustomers(customers, deletedCustomers, showDeleted);

  // Apply the sort order from props when it changes
  useState(() => {
    setSortDirection(sortOrder);
  });

  // Custom hook for customer actions
  const {
    selectedCustomer,
    isEditing,
    dialogOpen,
    formDefaults,
    setDialogOpen,
    prepareNewCustomerForm,
    handleEdit,
    handleDelete,
    handleRestore,
    handleSubmit
  } = useCustomerActions({
    isAdmin,
    canAddCustomer,
    canEditCustomer,
    canDeleteCustomer,
    addCustomer,
    updateCustomer,
    removeCustomerFromActive,
    removeCustomerFromDeleted,
    loadCustomersData
  });

  return (
    <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Customers</h2>
        <CustomerTableActions
          toggleSort={toggleSort}
          showDeleted={showDeleted}
          setShowDeleted={setShowDeleted}
          prepareNewCustomerForm={prepareNewCustomerForm}
          canAddCustomer={canAddCustomer}
          isAdmin={isAdmin}
        />
      </div>
      
      <CustomerFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortField={sortField}
        setSortField={setSortField}
        showDeleted={showDeleted}
      />
      
      <CustomerTableContent
        loading={loading}
        filteredCustomers={filteredCustomers}
        showDeleted={showDeleted}
        isAdmin={isAdmin}
        canEditCustomer={canEditCustomer}
        canDeleteCustomer={canDeleteCustomer}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRestore={handleRestore}
        sortField={sortField}
        sortDirection={sortDirection}
        toggleSort={toggleSort}
      />
      
      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isEditing={isEditing}
        formDefaults={formDefaults}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
