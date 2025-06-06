
import React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CustomerTableHeaderProps {
  sortField: "custno" | "custname" | "payterm";
  sortDirection: "asc" | "desc";
  toggleSort: (field: "custno" | "custname" | "payterm") => void;
  isAdmin: boolean;
}

export function CustomerTableHeader({
  sortField,
  sortDirection,
  toggleSort,
  isAdmin
}: CustomerTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="cursor-pointer" onClick={() => toggleSort("custno")}>
          Customer No {sortField === "custno" && (sortDirection === "asc" ? "↑" : "↓")}
        </TableHead>
        <TableHead className="cursor-pointer" onClick={() => toggleSort("custname")}>
          Name {sortField === "custname" && (sortDirection === "asc" ? "↑" : "↓")}
        </TableHead>
        <TableHead>Address</TableHead>
        <TableHead className="cursor-pointer" onClick={() => toggleSort("payterm")}>
          Payment Term {sortField === "payterm" && (sortDirection === "asc" ? "↑" : "↓")}
        </TableHead>
        
        {/* Only show Status and Stamp column headers for admin users */}
        {isAdmin && <TableHead>Status</TableHead>}
        {isAdmin && <TableHead>Stamp</TableHead>}
        
        <TableHead className="w-[100px]">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
