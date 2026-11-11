import type { ReportStatus } from "@luzinga/contracts";
import type {
  MissingPersonReport,
  NewMissingPersonReport,
  SearchMissingPersonReportsFilters,
  SearchMissingPersonReportsResult,
} from "@/modules/reports/domain/missing-person-report";

export interface MissingPersonReportRepository {
  create(input: NewMissingPersonReport): Promise<MissingPersonReport>;
  findById(id: string): Promise<MissingPersonReport | null>;
  search(
    filters: SearchMissingPersonReportsFilters,
  ): Promise<SearchMissingPersonReportsResult>;
  updateStatus(id: string, status: ReportStatus): Promise<MissingPersonReport>;
}
