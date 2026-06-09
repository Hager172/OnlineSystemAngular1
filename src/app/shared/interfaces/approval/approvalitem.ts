export interface ApprovalItem {
  id: string;
  name?: string;
  description?: string;
  servicename?: string;
  quantity: number;
  quantityUnit?: string;
  unitPrice: number;
    originalQuantity?: number;

}