import { Injectable, Inject } from '@nestjs/common';
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

  protected getWhereConditions(query?: GetReportsDto): SQL[] {
    const conditions: SQL[] = [];
    if (query?.status) {
      conditions.push(eq(schema.reports.status, query.status));
    }
    return conditions;
  }

  // Keep original method names for backward compatibility
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
    return this.update(id, data);
  }

  async deleteReport(id: string) {
    return this.delete(id);
  }
}
