
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
import { Customer } from '@/components/customers/CustomerService';

const CustomersPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const { customers, isLoading, error, refetch } = useCustomersData();
  const { userPermissions, canAddCustomer, canEditCustomer, canDeleteCustomer } = useCustomerPermissions();
  const { 
    selectedCustomer, 
    isEditing, 
    dialogOpen, 
    formDefaults, 
    setDialogOpen, 
    handleOpenDialog,
    handleCloseDialog,
    handleEdit,
    handleDelete,
    handleView,
    handleSubmit,
    isDeleting,
    getCustomerStatus
  } = useCustomerActions({ onSuccess: refetch });

  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center p-6">
          <p className="text-red-500">Failed to load customers</p>
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
              <Button onClick={() => handleOpenDialog(false)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            )}
          </div>
        </div>

        {viewMode === 'table' ? (
          <CustomersTable
            customers={customers}
            isLoading={isLoading}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onView={handleView}
            getCustomerStatus={getCustomerStatus}
            isDeleting={isDeleting}
          />
        ) : (
          <CustomerGrid
            customers={customers as Customer[]}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onView={handleView}
            getCustomerStatus={getCustomerStatus}
            isDeleting={isDeleting}
            isAdmin={isAdmin}
          />
        )}

        <CustomerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          defaultValues={formDefaults}
          isEditing={isEditing}
          onSubmit={handleSubmit}
        />
      </div>
    </DashboardLayout>
  );
};

export default CustomersPage;
