import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ReportStatus } from "@luzinga/contracts";
import type {
  MissingPersonReport,
  NewMissingPersonReport,
  SearchMissingPersonReportsFilters,
  SearchMissingPersonReportsResult,
} from "@/modules/reports/domain/missing-person-report";
import type { MissingPersonReportRepository } from "@/modules/reports/ports/missing-person-report.repository";

type ReportRecord = {
  id: string;
  reporterId: string;
  fullName: string;
  age: number | null;
  birthPlace: string | null;
  parentNames: string[];
  lastSeenAddress: string | null;
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
};

function toDomain(record: ReportRecord): MissingPersonReport {
  return {
    id: record.id,
    reporterId: record.reporterId,
    fullName: record.fullName,
    age: record.age,
    birthPlace: record.birthPlace,
    parentNames: record.parentNames,
    lastSeenAddress: record.lastSeenAddress,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class PrismaMissingPersonReportRepository
  implements MissingPersonReportRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: NewMissingPersonReport): Promise<MissingPersonReport> {
    const record = await this.prisma.missingPersonReport.create({
      data: {
        reporterId: input.reporterId,
        fullName: input.fullName,
        age: input.age,
        birthPlace: input.birthPlace,
        parentNames: input.parentNames,
        lastSeenAddress: input.lastSeenAddress,
        status: input.status,
      },
    });

    return toDomain(record);
  }

  async findById(id: string): Promise<MissingPersonReport | null> {
    const record = await this.prisma.missingPersonReport.findUnique({
      where: { id },
    });

    return record ? toDomain(record) : null;
  }

  async search(
    filters: SearchMissingPersonReportsFilters,
  ): Promise<SearchMissingPersonReportsResult> {
    // TODO: evoluir para full-text search com tsvector + pg_trgm/unaccent
    // para atender RF-06 com tolerância a variações de grafia.
    const where: Prisma.MissingPersonReportWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.query) {
      where.OR = [
        { fullName: { contains: filters.query, mode: "insensitive" } },
        { birthPlace: { contains: filters.query, mode: "insensitive" } },
        { lastSeenAddress: { contains: filters.query, mode: "insensitive" } },
        { parentNames: { has: filters.query } },
      ];
    }

    const [records, total] = await this.prisma.$transaction([
      this.prisma.missingPersonReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: filters.offset,
        take: filters.limit,
      }),
      this.prisma.missingPersonReport.count({ where }),
    ]);

    return {
      items: records.map(toDomain),
      total,
      limit: filters.limit,
      offset: filters.offset,
    };
  }

  async updateStatus(id: string, status: ReportStatus): Promise<MissingPersonReport> {
    const record = await this.prisma.missingPersonReport.update({
      where: { id },
      data: { status },
    });

    return toDomain(record);
  }
}
