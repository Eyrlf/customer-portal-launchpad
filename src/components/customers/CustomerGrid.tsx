
import React from "react";
import { Customer } from "../sales/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "../sales/StatusBadge";
import { User, Phone, MapPin, Calendar } from "lucide-react";
import { CustomerActions } from "./CustomerActions";
import { formatDateOnlyByUserPreference } from "@/utils/dateFormatter";

interface CustomerGridProps {
  customers: Customer[];
  onDelete: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  getCustomerStatus: (customer: Customer) => string;
  isDeleting?: boolean;
  isAdmin?: boolean;
  onView?: (customer: Customer) => void;
}

export function CustomerGrid({ 
  customers, 
  onDelete, 
  onEdit, 
  getCustomerStatus, 
  isDeleting = false,
  isAdmin = false,
  onView
}: CustomerGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {customers.map((customer) => (
        <Card key={customer.custno} className="overflow-hidden transition-shadow hover:shadow-md">
          <CardHeader className="border-b bg-gray-50 p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold line-clamp-1">{customer.custname || "Unnamed Customer"}</h3>
                <p className="text-sm text-gray-500">{customer.custno}</p>
              </div>
              <StatusBadge status={getCustomerStatus(customer)} />
            </div>
          </CardHeader>
          
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-1" />
              <span className="text-sm line-clamp-2">{customer.address || "No address"}</span>
            </div>
            
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{customer.phone}</span>
              </div>
            )}
            
            {customer.payterm && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Payment term: {customer.payterm}</span>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="border-t p-4 bg-gray-50">
            <CustomerActions 
              customer={customer} 
              onDelete={onDelete}
              onEdit={onEdit}
              onView={onView}
              isDeleting={isDeleting}
              isAdmin={isAdmin}
            />
          </CardFooter>
        </Card>
      ))}
      
      {customers.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
          <User className="h-12 w-12 text-gray-300 mb-2" />
          <h3 className="text-lg font-medium">No customers found</h3>
          <p className="text-gray-500 text-sm">Try adjusting your filters or add a new customer.</p>
        </div>
      )}
    </div>
  );
}
