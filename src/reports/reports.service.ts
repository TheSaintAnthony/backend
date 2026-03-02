import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, SQL } from 'drizzle-orm';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from 'src/db/schema';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { CreateReportDto, UpdateReportDto, GetReportsDto } from './dto';

type Report = typeof schema.reports.$inferSelect;

@Injectable()
export class ReportsService extends BaseCrudService<
  Report,
  CreateReportDto,
  UpdateReportDto,
  GetReportsDto
> {
  constructor(
    @Inject(DB_PROVIDER)
    db: NodePgDatabase<typeof schema>,
    @InjectQueue('email') private emailQueue: Queue,
  ) {
    super(db, {
      table: schema.reports,
      entityName: 'Report',
      defaultOrderBy: schema.reports.createdAt,
    });
  }

  protected transformCreateData(data: CreateReportDto) {
    return {
      ...data,
      occurrenceDate: new Date(data.occurrenceDate),
      status: 'pending',
    };
  }

  protected async afterCreate(entity: Report, createData?: CreateReportDto): Promise<void> {
    if (
      !entity.isAnonymous &&
      entity.reporterEmail &&
      entity.reporterName
    ) {
      await this.emailQueue.add('sendReportConfirmation', {
        data: {
          reporterName: entity.reporterName,
          reporterEmail: entity.reporterEmail,
          subject: entity.subject,
          relationship: entity.relationship,
          occurrenceDate: entity.occurrenceDate.toISOString(),
          submittedAt: entity.createdAt.toISOString(),
          reportId: entity.id,
          locale: createData?.locale || 'pt',
        },
      });
    }
  }

  protected getWhereConditions(query?: GetReportsDto): SQL[] {
    const conditions: SQL[] = [];
    if (query?.status) {
      conditions.push(eq(schema.reports.status, query.status));
    }
    return conditions;
  }

  async createReport(data: CreateReportDto) {
    return this.create(data);
  }

  async getReports(query: GetReportsDto) {
    return this.getAll(query);
  }

  async getReportById(id: string) {
    return this.getById(id);
  }

  async updateReport(id: string, data: UpdateReportDto) {
    const existing = await this.getById(id);
    const updated = await this.update(id, data);

    if (
      data.status &&
      data.status !== existing.status &&
      !updated.isAnonymous &&
      updated.reporterEmail &&
      updated.reporterName
    ) {
      await this.emailQueue.add('sendReportStatusUpdate', {
        data: {
          reporterName: updated.reporterName,
          reporterEmail: updated.reporterEmail,
          reportId: updated.id,
          oldStatus: existing.status,
          newStatus: updated.status,
          updatedAt: updated.updatedAt?.toISOString() ?? new Date().toISOString(),
        },
      });
    }

    return updated;
  }
}
