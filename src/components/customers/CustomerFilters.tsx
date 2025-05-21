
import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomerFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortField: "custno" | "custname" | "payterm";
  setSortField: (field: "custno" | "custname" | "payterm") => void;
  showDeleted: boolean;
}

export function CustomerFilters({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  sortField,
  setSortField,
  showDeleted
}: CustomerFiltersProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input 
          placeholder="Search customers..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger>
          <SelectValue placeholder="Filter by Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All Status">All Status</SelectItem>
          <SelectItem value="Added">Added</SelectItem>
          <SelectItem value="Edited">Edited</SelectItem>
          <SelectItem value="Restored">Restored</SelectItem>
          {showDeleted && <SelectItem value="Deleted">Deleted</SelectItem>}
        </SelectContent>
      </Select>
      
      <Select value={sortField} onValueChange={(value: any) => setSortField(value)}>
        <SelectTrigger>
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="custno">Customer No</SelectItem>
          <SelectItem value="custname">Customer Name</SelectItem>
          <SelectItem value="payterm">Payment Term</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
