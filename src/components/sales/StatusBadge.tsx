
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string | undefined;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  
  switch (status.toLowerCase()) {
    case 'added':
      return <Badge className="bg-green-500 text-white">Added</Badge>;
    case 'edited':
      return <Badge className="bg-blue-500 text-white">Edited</Badge>;
    case 'deleted':
      return <Badge variant="destructive">Deleted</Badge>;
    case 'restored':
      return <Badge className="bg-purple-500 text-white">Restored</Badge>;
    case 'paid':
      return <Badge className="bg-green-500 text-white">Paid</Badge>;
    case 'partial':
      return <Badge className="bg-yellow-500 text-white">Partial</Badge>;
    case 'unpaid':
      return <Badge variant="destructive">Unpaid</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
