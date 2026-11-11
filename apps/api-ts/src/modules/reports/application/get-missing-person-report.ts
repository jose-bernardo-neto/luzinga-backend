import type { MissingPersonReport } from "@/modules/reports/domain/missing-person-report";
import { NotFoundError } from "@/shared/errors/app-error";
import type { MissingPersonReportRepository } from "@/modules/reports/ports/missing-person-report.repository";

export class GetMissingPersonReport {
  constructor(private readonly repository: MissingPersonReportRepository) {}

  async execute(id: string): Promise<MissingPersonReport> {
    const report = await this.repository.findById(id);

    if (!report) {
      throw new NotFoundError("Ficha de pessoa desaparecida não encontrada.");
    }

    return report;
  }
}
