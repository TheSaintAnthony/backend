import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  PasswordResetDto,
  SignInDto,
  SignUpDto,
  ForgotPasswordDto,
} from './dto/auth.dto';
import { Public, OptionalAuth } from 'src/decorators';
import type { AuthenticatedRequest } from './interfaces';
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('signup')
  async signUp(@Body() data: SignUpDto) {
    return this.authService.signUp(data);
  }
  
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(@Body() data: SignInDto) {
    return this.authService.signIn(data);
  }
  @Public()
  @Post('password/forgot')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @OptionalAuth()
  @ApiBearerAuth('access-token')
  @Post('password/reset')
  async resetPassword(
    @Body() passwordResetDto: PasswordResetDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req?.user?.sub;
    return this.authService.resetPassword(passwordResetDto, userId);
  }

  @Public()
  @Get('verify')
  async verifyUser(@Query('token') token: string) {
    return await this.authService.verifyUser(token);
  }
}
