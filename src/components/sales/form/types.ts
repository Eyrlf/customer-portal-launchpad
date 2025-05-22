
import { z } from "zod";
import { Product } from "../types";
import { Customer, SalesRecord } from "../types";

export const formSchema = z.object({
  transno: z.string().min(1, "Transaction number is required"),
  salesdate: z.date().nullable(),
  custno: z.string().nullable(),
  items: z.array(z.object({
    prodcode: z.string(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    deleted_at: z.string().nullable().optional(),
  })),
});

export type FormValues = z.infer<typeof formSchema>;

export interface SaleItemFormData {
  prodcode: string;
  quantity: number;
  deleted_at?: string | null;
}

export interface ProductWithQuantity extends Product {
  quantity: number;
}

export interface SaleFormProps {
  selectedSale: SalesRecord | null;
  isEditing: boolean;
  customers: Customer[];
  onSubmitSuccess: () => void;
  onCancel: () => void;
}

export type SaleFormData = {
  transno: string;
  salesdate: Date | null;
  custno: string | null;
  items: SaleItemFormData[];
};
