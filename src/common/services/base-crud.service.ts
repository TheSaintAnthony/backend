import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, count, and, SQL } from 'drizzle-orm';
import { PgTableWithColumns, PgColumn } from 'drizzle-orm/pg-core';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from 'src/db/schema';
import { NotFoundException } from 'src/filters';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';

export interface BaseCrudConfig<T> {
  table: PgTableWithColumns<any>;
  entityName: string;
  defaultOrderBy?: PgColumn | SQL;
}

export abstract class BaseCrudService<
  TEntity,
  TCreateDto,
  TUpdateDto,
  TQueryDto extends PaginationDto,
> {
  constructor(
    @Inject(DB_PROVIDER)
    protected readonly db: NodePgDatabase<typeof schema>,
    protected readonly config: BaseCrudConfig<TEntity>,
  ) {}

  /**
   * Override this method to add custom filters based on query DTO
   */
  protected getWhereConditions(query?: TQueryDto): SQL[] {
    return [];
  }

  /**
   * Override this method to transform data before creation
   */
  protected transformCreateData(data: TCreateDto): any {
    return data;
  }

  /**
   * Override this method to add post-creation logic (e.g., sending notifications)
   */
  protected async afterCreate(
    entity: TEntity,
    createData?: TCreateDto,
  ): Promise<void> {
    void entity;
    void createData;
  }

  async create(data: TCreateDto): Promise<TEntity> {
    const transformedData = this.transformCreateData(data);
    const [entity] = await this.db
      .insert(this.config.table)
      .values(transformedData)
      .returning();

    await this.afterCreate(entity as TEntity, data);
    return entity as TEntity;
  }

  async getAll(query: TQueryDto) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 10, 100);
    const offset = (page - 1) * limit;

    const whereConditions = this.getWhereConditions(query);

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(this.config.table)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    const total = totalResult.count;

    const query_builder = this.db
      .select()
      .from(this.config.table)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(limit)
      .offset(offset);

    const data = this.config.defaultOrderBy
      ? await query_builder.orderBy(this.config.defaultOrderBy)
      : await query_builder;

    return createPaginatedResponse(data, total, page, limit);
  }

  async getById(id: string): Promise<TEntity> {
    const [entity] = await this.db
      .select()
      .from(this.config.table)
      .where(eq(this.config.table.id, id))
      .limit(1);

    if (!entity) {
      throw new NotFoundException(this.config.entityName, id);
    }
    return entity as TEntity;
  }

  async update(id: string, data: TUpdateDto): Promise<TEntity> {
    await this.getById(id);
    const [updated] = await this.db
      .update(this.config.table)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(this.config.table.id, id))
      .returning();
    return updated as TEntity;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await this.db.delete(this.config.table).where(eq(this.config.table.id, id));
  }
}
