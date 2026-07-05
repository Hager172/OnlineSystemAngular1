export interface ApprovalItem {
  id: string | number;

  name?: string;
  description?: string;
  servicename?: string;

  quantity: number;
  originalQuantity?: number;
  editqty?: number;
  days?: number;

  quantityUnit?: string;
  unitPrice: number;

  serviceId?: number;

  isNew?: boolean;
}