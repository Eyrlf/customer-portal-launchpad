
import React from 'react';
import { Link } from 'react-router-dom';
import { Customer } from './CustomerService';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash, RefreshCw, Eye } from 'lucide-react';

interface CustomerGridProps {
  customers: Customer[];
  showDeleted?: boolean;
  isAdmin?: boolean;
  canEditCustomer?: boolean;
  canDeleteCustomer?: boolean;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  onRestore?: (customer: Customer) => void;
  onView?: (customer: Customer) => void;
  getCustomerStatus?: (customer: Customer) => string;
  isDeleting?: boolean;
}

export function CustomerGrid({
  customers,
  showDeleted = false,
  isAdmin = false,
  canEditCustomer = false,
  canDeleteCustomer = false,
  onEdit,
  onDelete,
  onRestore,
  onView,
  getCustomerStatus,
  isDeleting = false,
}: CustomerGridProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'Deleted':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Edited':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Restored':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (customers.length === 0) {
    return (
      <div className="text-center p-10 border rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">No customers found</p>
      </div>
    );
  }

  return (
    <div className="customer-grid-container p-2 pt-4">
      <div className="customer-grid">
        {customers.map((customer) => {
          const status = getCustomerStatus ? getCustomerStatus(customer) : 'Active';
          const statusClass = getStatusColor(status);
          
          return (
            <Card 
              key={customer.custno} 
              className="customer-card relative overflow-hidden"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <h3 className="customer-name text-lg font-semibold truncate">
                    {customer.custname}
                  </h3>
                  <Badge className={`${statusClass}`}>
                    {status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                <div className="customer-detail flex items-center">
                  <span className="text-sm truncate">{customer.address || 'No address'}</span>
                </div>
                <div className="customer-detail flex items-center">
                  <span className="text-sm">{customer.phone || 'No phone'}</span>
                </div>
                <div className="customer-detail flex items-center">
                  <span className="text-sm">{customer.email || 'No email'}</span>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between">
                {onView && (
                  <Button variant="outline" size="sm" onClick={() => onView(customer)}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                )}
                <div className="flex gap-2">
                  {canEditCustomer && onEdit && !showDeleted && (
                    <Button variant="outline" size="sm" onClick={() => onEdit(customer)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {canDeleteCustomer && !showDeleted && onDelete && (
                    <Button variant="outline" size="sm" onClick={() => onDelete(customer)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                  {showDeleted && onRestore && (
                    <Button variant="outline" size="sm" onClick={() => onRestore(customer)}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardFooter>
              {customer.updatedAt && (
                <div className="absolute top-2 right-2 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(customer.updatedAt).toLocaleDateString()}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
