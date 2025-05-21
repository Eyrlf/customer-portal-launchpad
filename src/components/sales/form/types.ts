
import { z } from "zod";
import { SalesRecord, Customer } from "../types";

// Product interface
export interface Product {
  prodcode: string;
  description: string | null;
  unit: string | null;
  unitprice?: number;
}

// SaleItem interface with optional id and deleted_at
export interface SaleItem {
  id?: string;
  prodcode: string;
  quantity: number;
  unitprice: number;
  deleted_at?: string | null;
}

// Form schema with updated items to include id and deleted_at
export const formSchema = z.object({
  transno: z.string().min(1, "Transaction number is required"),
  salesdate: z.date().nullable(),
  custno: z.string().nullable(),
  items: z.array(
    z.object({
      id: z.string().optional(),
      prodcode: z.string().min(1, "Product is required"),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      deleted_at: z.string().nullable().optional(),
    })
  ),
});

// Form values type
export type FormValues = z.infer<typeof formSchema>;

// Props for the main SaleForm component
export interface SaleFormProps {
  selectedSale: SalesRecord | null;
  isEditing: boolean;
  customers: Customer[];
  onSubmitSuccess: () => void;
  onCancel: () => void;
}

// Type for salesdetail items from DB
export interface SalesDetailFromDB {
  id: string;
  prodcode: string;
  quantity: number;
  transno: string;
  deleted_at?: string | null;
}
