import type { ReportStatus } from "@luzinga/contracts";
import type { MissingPersonReport } from "@/modules/reports/domain/missing-person-report";
import { ForbiddenError, NotFoundError } from "@/shared/errors/app-error";
import type { MissingPersonReportRepository } from "@/modules/reports/ports/missing-person-report.repository";

export interface UpdateMissingPersonReportStatusInput {
  id: string;
  status: ReportStatus;
  actorId: string;
}

export class UpdateMissingPersonReportStatus {
  constructor(private readonly repository: MissingPersonReportRepository) {}

  async execute(
    input: UpdateMissingPersonReportStatusInput,
  ): Promise<MissingPersonReport> {
    const report = await this.repository.findById(input.id);

    if (!report) {
      throw new NotFoundError("Ficha de pessoa desaparecida não encontrada.");
    }

    if (report.reporterId !== input.actorId) {
      throw new ForbiddenError("Apenas o autor pode alterar o status desta ficha.");
    }

    return this.repository.updateStatus(input.id, input.status);
  }
}
