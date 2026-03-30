import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { cvFileUploadOptions } from 'src/common/helpers/file-upload.helper';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JobPostingsService } from './job-postings.service';
import {
  CreateJobPostingDto,
  UpdateJobPostingDto,
  SubmitApplicationDto,
  GetApplicationsDto,
} from './dto';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/user-roles/roles.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Job Postings')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Controller('job-postings')
export class JobPostingsController {
  constructor(private jobPostingsService: JobPostingsService) {}

  @Public()
  @Get()
  async getActiveJobPostings() {
    return this.jobPostingsService.getActiveJobPostings();
  }

  @Roles(UserRole.ADMIN)
  @Get('admin')
  async getAllJobPostings(@Query() query: PaginationDto) {
    return this.jobPostingsService.getAllJobPostings(query);
  }

  @Roles(UserRole.ADMIN)
  @Get('applications')
  async getApplications(@Query() query: GetApplicationsDto) {
    return this.jobPostingsService.getApplications(query);
  }

  @Roles(UserRole.ADMIN)
  @Get('applications/:id')
  async getApplicationById(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobPostingsService.getApplicationById(id);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/:id')
  async getJobPostingById(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobPostingsService.getJobPostingById(id);
  }

  @Roles(UserRole.ADMIN)
  @Post('admin')
  async createJobPosting(@Body() dto: CreateJobPostingDto) {
    return this.jobPostingsService.createJobPosting(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/:id')
  async updateJobPosting(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobPostingDto,
  ) {
    return this.jobPostingsService.updateJobPosting(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete('admin/:id')
  async deactivateJobPosting(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobPostingsService.deactivateJobPosting(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async updateJobPostingLegacy(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobPostingDto,
  ) {
    return this.jobPostingsService.updateJobPosting(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deactivateJobPostingLegacy(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobPostingsService.deactivateJobPosting(id);
  }

  @Roles(UserRole.ADMIN)
  @Delete('applications/:id')
  async deleteApplication(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobPostingsService.deleteApplication(id);
  }

  @Public()
  @Post(':id/apply')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('cv', cvFileUploadOptions))
  async applyToPosting(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitApplicationDto,
    @UploadedFile() cv: Express.Multer.File,
  ) {
    return this.jobPostingsService.submitApplication(dto, cv, id);
  }

  @Public()
  @Post('apply/spontaneous')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('cv', cvFileUploadOptions))
  async applySpontaneous(
    @Body() dto: SubmitApplicationDto,
    @UploadedFile() cv: Express.Multer.File,
  ) {
    return this.jobPostingsService.submitApplication(dto, cv);
  }
}
