import {
  normalizeCreateMissingPersonReportInput,
  type CreateMissingPersonReportInput,
  type MissingPersonReport,
} from "@/modules/reports/domain/missing-person-report";
import type { MissingPersonReportRepository } from "@/modules/reports/ports/missing-person-report.repository";

export class CreateMissingPersonReport {
  constructor(private readonly repository: MissingPersonReportRepository) {}

  async execute(input: CreateMissingPersonReportInput): Promise<MissingPersonReport> {
    const data = normalizeCreateMissingPersonReportInput(input);
    return this.repository.create(data);
  }
}
