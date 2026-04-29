import { ApprovallsclientDTO } from "./ApprovallsclientDTO";

export interface GetTodayApps {
  vendor_id: string | null;
  approvals: ApprovallsclientDTO[];
}