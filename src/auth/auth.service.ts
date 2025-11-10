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

  async signIn(data: SignInDto): Promise<{ accessToken: string }> {
    const user = await this.usersService.findOne(data.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.verifiedAt) {
      throw new UnauthorizedException('User not verified');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      verifiedAt: user.verifiedAt,
    };
    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }

  async signUp(data: SignUpDto) {
    const user = await this.usersService.findByEmail(data.email);

    if (user) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const result = await this.usersService.createUser({
      ...data,
      password: passwordHash,
    });

    await this.emailService.sendVerifyUserLink(result.id, result.email);
    return result;
  }

  async verifyUser(token: string) {
    const id: number = await this.decodeVerifyUserTokenToId(token);
    return await this.usersService.verifyUser(id);
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

  private async decodeVerifyUserTokenToId(token: string) {
    try {
      const payload: { subb: number; email: string } =
        await this.jwtService.verify(token, {
          secret: this.configService.get('JWT_USER_VERIFY_SECRET'),
        });

      if (typeof payload === 'object' && 'subb' in payload) {
        return payload.subb;
      }
      throw new BadRequestException();
    } catch (error) {
      if (error?.name === 'TokenExpiredError') {
        throw new BadRequestException('User verification token expired');
      }
      throw new BadRequestException('Bad confirmation token');
    }
  }
}
