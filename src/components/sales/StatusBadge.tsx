
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string | undefined;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  
  switch (status) {
    case 'Paid':
      return <Badge className="bg-green-500 text-white">Paid</Badge>;
    case 'Partial':
      return <Badge className="bg-yellow-500 text-white">Partial</Badge>;
    case 'Unpaid':
      return <Badge variant="destructive">Unpaid</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
