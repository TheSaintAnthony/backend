import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, count, and, isNull } from 'drizzle-orm';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from 'src/db/schema';
import { NotFoundException } from 'src/filters';
import { FileStorageService } from 'src/services/file-storage.service';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import {
  CreateJobPostingDto,
  UpdateJobPostingDto,
  SubmitApplicationDto,
  GetApplicationsDto,
} from './dto';

@Injectable()
export class JobPostingsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private fileStorageService: FileStorageService,
  ) {}

  async getActiveJobPostings() {
    return this.db
      .select()
      .from(schema.jobPostings)
      .where(eq(schema.jobPostings.isActive, true))
      .orderBy(schema.jobPostings.createdAt);
  }

  async getAllJobPostings(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100);
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.jobPostings);
    const total = totalResult.count;

    const data = await this.db
      .select()
      .from(schema.jobPostings)
      .limit(limit)
      .offset(offset)
      .orderBy(schema.jobPostings.createdAt);

    return createPaginatedResponse(data, total, page, limit);
  }

  async getJobPostingById(id: string) {
    const [posting] = await this.db
      .select()
      .from(schema.jobPostings)
      .where(eq(schema.jobPostings.id, id))
      .limit(1);

    if (!posting) {
      throw new NotFoundException('Job Posting', id);
    }
    return posting;
  }

  async createJobPosting(data: CreateJobPostingDto) {
    const [posting] = await this.db
      .insert(schema.jobPostings)
      .values({
        ...data,
        isActive: data.isActive ?? true,
      })
      .returning();
    return posting;
  }

  async updateJobPosting(id: string, data: UpdateJobPostingDto) {
    await this.getJobPostingById(id);
    const [updated] = await this.db
      .update(schema.jobPostings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.jobPostings.id, id))
      .returning();
    return updated;
  }

  async deactivateJobPosting(id: string) {
    await this.getJobPostingById(id);
    const [updated] = await this.db
      .update(schema.jobPostings)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.jobPostings.id, id))
      .returning();
    return updated;
  }

  async submitApplication(
    dto: SubmitApplicationDto,
    cvFile: Express.Multer.File,
    jobPostingId?: string,
  ) {
    if (jobPostingId) {
      await this.getJobPostingById(jobPostingId);
    }

    const { url, path: filePath } = await this.fileStorageService.saveFile(
      cvFile,
      'cv-applications',
    );

    const [application] = await this.db
      .insert(schema.jobApplications)
      .values({
        jobPostingId: jobPostingId ?? null,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        cvFilePath: url,
        cvOriginalName: cvFile.originalname,
        ...(dto.message && { message: dto.message }),
        ...(dto.address && { address: dto.address }),
        ...(dto.birthDate && { birthDate: dto.birthDate }),
        ...(dto.qualifications && { qualifications: dto.qualifications }),
        ...(dto.hotelExperience !== undefined && { hotelExperience: dto.hotelExperience }),
        ...(dto.restaurantExperience !== undefined && { restaurantExperience: dto.restaurantExperience }),
        ...(dto.realEstateExperience !== undefined && { realEstateExperience: dto.realEstateExperience }),
        ...(dto.driverLicense !== undefined && { driverLicense: dto.driverLicense }),
        ...(dto.linkedinProfile && { linkedinProfile: dto.linkedinProfile }),
      })
      .returning();

    return application;
  }

  async getApplications(query: GetApplicationsDto) {
    const page = query?.page || 1;
    const limit = Math.min(query?.limit || 10, 100);
    const offset = (page - 1) * limit;

    const whereConditions = [];
    if (query?.jobPostingId) {
      whereConditions.push(
        eq(schema.jobApplications.jobPostingId, query.jobPostingId),
      );
    }

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.jobApplications)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    const total = totalResult.count;

    const applications = await this.db
      .select({
        id: schema.jobApplications.id,
        jobPostingId: schema.jobApplications.jobPostingId,
        name: schema.jobApplications.name,
        email: schema.jobApplications.email,
        phone: schema.jobApplications.phone,
        message: schema.jobApplications.message,
        address: schema.jobApplications.address,
        birthDate: schema.jobApplications.birthDate,
        qualifications: schema.jobApplications.qualifications,
        hotelExperience: schema.jobApplications.hotelExperience,
        restaurantExperience: schema.jobApplications.restaurantExperience,
        realEstateExperience: schema.jobApplications.realEstateExperience,
        driverLicense: schema.jobApplications.driverLicense,
        linkedinProfile: schema.jobApplications.linkedinProfile,
        cvFilePath: schema.jobApplications.cvFilePath,
        cvOriginalName: schema.jobApplications.cvOriginalName,
        createdAt: schema.jobApplications.createdAt,
        jobPostingTitle: schema.jobPostings.title,
      })
      .from(schema.jobApplications)
      .leftJoin(
        schema.jobPostings,
        eq(schema.jobApplications.jobPostingId, schema.jobPostings.id),
      )
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(limit)
      .offset(offset)
      .orderBy(schema.jobApplications.createdAt);

    return createPaginatedResponse(applications, total, page, limit);
  }

  async getApplicationById(id: string) {
    const [application] = await this.db
      .select({
        id: schema.jobApplications.id,
        jobPostingId: schema.jobApplications.jobPostingId,
        name: schema.jobApplications.name,
        email: schema.jobApplications.email,
        phone: schema.jobApplications.phone,
        message: schema.jobApplications.message,
        address: schema.jobApplications.address,
        birthDate: schema.jobApplications.birthDate,
        qualifications: schema.jobApplications.qualifications,
        hotelExperience: schema.jobApplications.hotelExperience,
        restaurantExperience: schema.jobApplications.restaurantExperience,
        realEstateExperience: schema.jobApplications.realEstateExperience,
        driverLicense: schema.jobApplications.driverLicense,
        linkedinProfile: schema.jobApplications.linkedinProfile,
        cvFilePath: schema.jobApplications.cvFilePath,
        cvOriginalName: schema.jobApplications.cvOriginalName,
        createdAt: schema.jobApplications.createdAt,
        jobPostingTitle: schema.jobPostings.title,
      })
      .from(schema.jobApplications)
      .leftJoin(
        schema.jobPostings,
        eq(schema.jobApplications.jobPostingId, schema.jobPostings.id),
      )
      .where(eq(schema.jobApplications.id, id))
      .limit(1);

    if (!application) {
      throw new NotFoundException('Job Application', id);
    }
    return application;
  }

  async deleteApplication(id: string) {
    const application = await this.getApplicationById(id);
    await this.db
      .delete(schema.jobApplications)
      .where(eq(schema.jobApplications.id, id));
    return application;
  }
}
