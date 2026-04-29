export interface ServiceResponse<T> {
  data: T;
  success: boolean;
  status: number;
  messageEn: string;
  messageAr: string;
}