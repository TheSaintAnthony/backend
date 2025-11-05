/* eslint-disable */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PasswordResetDto, SignInDto, SignUpDto } from './dto/auth.dto';
import { JwtPayload } from './interfaces';
import { EmailService } from 'src/email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async signIn(data: SignInDto): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(data.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async signUp(data: SignUpDto) {
    const user = await this.usersService.findOne(data.email);

    if (user) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const result = await this.usersService.createUser({
      ...data,
      password: passwordHash,
    });

    return result;
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findOne(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.emailService.sendResetPasswordLink(email);
  }

  async resetPassword(data: PasswordResetDto) {
    const email = await this.decodeResetPasswordTokenToEmail(data.token);

    const user = await this.usersService.findOne(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHashed = await bcrypt.hash(data.password, 10);
    const result = await this.usersService.resetPassword(email, passwordHashed);

    return result;
  }

  private async decodeResetPasswordTokenToEmail(token: string) {
    try {
      const payload: { email: string } = await this.jwtService.verify(token, {
        secret: this.configService.get('JWT_PASSWORD_RESET_SECRET'),
      });

      if (typeof payload === 'object' && 'email' in payload) {
        return payload.email;
      }
      throw new BadRequestException();
    } catch (error) {
      if (error?.name === 'TokenExpiredError') {
        throw new BadRequestException('Password reset token expired');
      }
      throw new BadRequestException('Bad confirmation token');
    }
  }
}
