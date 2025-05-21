
import { useState, useMemo } from "react";
import { Customer, getCustomerStatus } from "../CustomerService";

export function useFilteredCustomers(
  customers: Customer[],
  deletedCustomers: Customer[],
  showDeleted: boolean
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortField, setSortField] = useState<"custno" | "custname" | "payterm">("custno");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const filteredCustomers = useMemo(() => {
    const dataSource = showDeleted ? deletedCustomers : customers;
    
    return dataSource.filter(customer => {
      // Apply search filter
      const matchesSearch = searchQuery === "" || 
        (customer.custname?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        customer.custno.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.address?.toLowerCase().includes(searchQuery.toLowerCase()));

      // Apply status filter
      let matchesStatus = true;
      if (statusFilter !== "All Status") {
        const status = getCustomerStatus(customer);
        matchesStatus = statusFilter === status;
      }

      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      // Apply sorting
      let comparison = 0;
      
      if (sortField === "custno") {
        comparison = a.custno.localeCompare(b.custno);
      } else if (sortField === "custname") {
        comparison = (a.custname || "").localeCompare(b.custname || "");
      } else if (sortField === "payterm") {
        comparison = (a.payterm || "").localeCompare(b.payterm || "");
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [customers, deletedCustomers, showDeleted, searchQuery, statusFilter, sortField, sortDirection]);

  const toggleSort = (field: "custno" | "custname" | "payterm") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return {
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
  };
}
