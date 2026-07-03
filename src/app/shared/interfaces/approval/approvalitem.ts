export interface ApprovalItem {
  id: string | number; // عشان يقبل string من الـ API ويقبل 0 أو number للجديد
  name?: string;
  description?: string;
  servicename?: string;
  quantity: number;
  quantityUnit?: string;
  unitPrice: number;
  originalQuantity?: number;
  editqty?: number;
  isNew?: boolean;   // ضفنا الحقل ده هنا عشان الـ TypeScript ميعترضش
}