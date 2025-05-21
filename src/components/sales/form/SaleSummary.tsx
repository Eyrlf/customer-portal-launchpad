
import React from "react";

interface SaleSummaryProps {
  totalAmount: number;
}

export function SaleSummary({ totalAmount }: SaleSummaryProps) {
  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-md">
      <div className="flex justify-between items-center font-medium">
        <span>Total Amount:</span>
        <span className="text-lg">${totalAmount.toFixed(2)}</span>
      </div>
    </div>
  );
}
