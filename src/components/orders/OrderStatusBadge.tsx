import { getOrderStatusColor, getOrderStatusLabel } from '@/types/orders';
import type { OrderStatus } from '@/types/orders';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export default function OrderStatusBadge({ status, className = '' }: OrderStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(
        status
      )} ${className}`}
    >
      {getOrderStatusLabel(status)}
    </span>
  );
}