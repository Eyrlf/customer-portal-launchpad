
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CustomersTable } from '@/components/customers/CustomersTable';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { useCustomersData } from '@/components/customers/hooks/useCustomersData';
import { useCustomerActions } from '@/components/customers/hooks/useCustomerActions';
import { useCustomerPermissions } from '@/components/customers/hooks/useCustomerPermissions';
import { Button } from '@/components/ui/button';
import { Plus, Grid, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerGrid } from '@/components/customers/CustomerGrid';
import { Customer, getCustomerStatus } from '@/components/customers/CustomerService';
import { useToast } from '@/hooks/use-toast';

const CustomersPage = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showDeleted, setShowDeleted] = useState(false);
  
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

  // Handler for viewing customer details
  const handleView = (customer: Customer) => {
    navigate(`/dashboard/customers/${customer.custno}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center p-6">
          <p>Loading customers...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Customers</h1>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'table' ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-l-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
            {canAddCustomer && (
              <Button onClick={prepareNewCustomerForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            )}
          </div>
        </div>

        {viewMode === 'table' ? (
          <CustomersTable 
            sortOrder="asc"
            viewMode="table"
          />
        ) : (
          <CustomerGrid
            customers={customers}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onView={handleView}
            isDeleting={false}
            isAdmin={isAdmin}
            showDeleted={showDeleted}
            canEditCustomer={canEditCustomer}
            canDeleteCustomer={canDeleteCustomer}
            onRestore={handleRestore}
            getCustomerStatus={getCustomerStatus}
          />
        )}

        <CustomerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          formDefaults={formDefaults}
          isEditing={isEditing}
          onSubmit={handleSubmit}
        />
      </div>
    </DashboardLayout>
  );
};

export default CustomersPage;
