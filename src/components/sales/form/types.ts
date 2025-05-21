
import { z } from "zod";
import { SalesRecord, Customer, SaleItem, Product } from "../types";

// Form schema with updated items to include id and without deleted_at
export const formSchema = z.object({
  transno: z.string().min(1, "Transaction number is required"),
  salesdate: z.date().nullable(),
  custno: z.string().nullable(),
  items: z.array(
    z.object({
      id: z.string().optional(),
      prodcode: z.string().min(1, "Product is required"),
      quantity: z.number().min(1, "Quantity must be at least 1"),
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
