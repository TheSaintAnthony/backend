import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  PasswordResetDto,
  SignInDto,
  SignUpDto,
  ForgotPasswordDto,
} from './dto/auth.dto';
import { Public } from 'src/decorators/public.decorator';

@ApiTags('Auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('signup')
  async signUp(@Body() data: SignUpDto) {
    return this.authService.signUp(data);
  }

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(@Body() data: SignInDto) {
    return this.authService.signIn(data);
  }

  @Post('password/forgot')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('password/reset')
  async resetPassword(@Body() passwordResetDto: PasswordResetDto) {
    return this.authService.resetPassword(passwordResetDto);
  }

  @Get('verify')
  async verifyUser(@Query('token') token: string) {
    return await this.authService.verifyUser(token);
  }
}
