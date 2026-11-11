import type { ReportStatus } from "@luzinga/contracts";
import type { SearchMissingPersonReportsResult } from "@/modules/reports/domain/missing-person-report";
import type { MissingPersonReportRepository } from "@/modules/reports/ports/missing-person-report.repository";

export interface ListMissingPersonReportsInput {
  query?: string;
  status?: ReportStatus;
  limit?: number;
  offset?: number;
}

export class ListMissingPersonReports {
  constructor(private readonly repository: MissingPersonReportRepository) {}

  async execute(
    input: ListMissingPersonReportsInput,
  ): Promise<SearchMissingPersonReportsResult> {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const offset = Math.max(input.offset ?? 0, 0);
    const query = input.query?.trim();

    return this.repository.search({
      query: query && query.length > 0 ? query : undefined,
      status: input.status,
      limit,
      offset,
    });
  }
}
