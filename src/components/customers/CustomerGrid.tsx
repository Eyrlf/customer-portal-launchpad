
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Building, Phone, Calendar } from "lucide-react";
import { CustomerActions } from "./CustomerActions";
import { StatusBadge } from "../sales/StatusBadge";
import { getCustomerStatus } from "./CustomerService";

interface Customer {
  custno: string;
  custname: string | null;
  address: string | null;
  payterm: string | null;
  deleted_at: string | null;
  modified_at?: string | null;
  modified_by?: string | null;
  action?: string;
}

interface CustomerGridProps {
  customers: Customer[];
  showDeleted: boolean;
  isAdmin: boolean;
  canEditCustomer: boolean;
  canDeleteCustomer: boolean;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onRestore: (customer: Customer) => void;
}

export function CustomerGrid({
  customers,
  showDeleted,
  isAdmin,
  canEditCustomer,
  canDeleteCustomer,
  onEdit,
  onDelete,
  onRestore
}: CustomerGridProps) {
  if (customers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          {showDeleted ? "No deleted customers found." : "No customers found."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {customers.map((customer) => {
        const status = getCustomerStatus(customer);
        
        return (
          <Card key={customer.custno} className={showDeleted ? "bg-gray-50 border-gray-300" : ""}>
            <CardHeader className="pb-2">
              {!showDeleted ? (
                <CardTitle className="text-lg">
                  <Link 
                    to={`/dashboard/customers/${customer.custno}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {customer.custname || 'Unnamed Customer'}
                  </Link>
                </CardTitle>
              ) : (
                <CardTitle className="text-lg">{customer.custname || 'Unnamed Customer'}</CardTitle>
              )}
              <div className="flex justify-between items-center">
                <Badge variant="outline" className="text-xs">{customer.custno}</Badge>
                <StatusBadge status={status} />
              </div>
            </CardHeader>
            <CardContent className="pb-2 space-y-2">
              <div className="flex items-center text-sm">
                <Building className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-gray-600">{customer.address || 'No address'}</span>
              </div>
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-gray-600">{customer.payterm || 'No payment term'}</span>
              </div>
            </CardContent>
            <CardFooter className="pt-2 flex justify-end">
              <CustomerActions
                customer={customer}
                showDeleted={showDeleted}
                isAdmin={isAdmin}
                canEditCustomer={canEditCustomer}
                canDeleteCustomer={canDeleteCustomer}
                onEdit={onEdit}
                onDelete={onDelete}
                onRestore={onRestore}
              />
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
