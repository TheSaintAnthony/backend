import { Injectable } from '@nestjs/common';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from 'src/filters';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PasswordResetDto, SignInDto, SignUpDto } from './dto/auth.dto';
import {
  JwtPayload,
  PasswordResetTokenPayload,
  UserVerifyTokenPayload,
} from './interfaces';
import { EmailService } from 'src/email/email.service';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EmailJobData } from 'src/queues/interfaces';
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
    @InjectQueue('email') private emailsQueue: Queue,
  ) {}
  async signIn(data: SignInDto): Promise<{ accessToken: string }> {
    const user = await this.usersService.findOneByEmail(data.email);
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
    const userRoles: UserRole[] = user.roles.map((role) => {
      const roleName = String(role.name);
      return roleName === String(UserRole.ADMIN)
        ? UserRole.ADMIN
        : UserRole.USER;
    });
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      verifiedAt: user.verifiedAt,
      roles: userRoles,
    };
    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }
  async signUp(data: SignUpDto) {
    const user = await this.usersService.findByEmailOrNull(data.email);
    if (user) {
      throw new ConflictException('User with this email already exists', {
        email: data.email,
      });
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const result = await this.usersService.createUser({
      ...data,
      password: passwordHash,
    });
    const emailJobData: EmailJobData = {
      data: { id: result.id, email: result.email },
    };
    await this.emailsQueue.add('sendVerifyUserLink', emailJobData);
    return result;
  }
  async verifyUser(token: string) {
    const id: string = await this.decodeVerifyUserTokenToId(token);
    return await this.usersService.verifyUser(id);
  }
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User', email);
    }
    await this.emailsQueue.add('sendResetPasswordLink', { data: email });
  }
  async resetPassword(data: PasswordResetDto, userId?: string) {
    let user;

    if (data.token) {
      const { email, tokenIssuedAt } =
        await this.decodeResetPasswordTokenToEmail(data.token);
      user = await this.usersService.findOneByEmail(email);
      if (!user) {
        throw new NotFoundException('User', email);
      }

      if (user.passwordChangedAt) {
        const passwordChangedAtTimestamp = new Date(
          user.passwordChangedAt,
        ).getTime();
        const tokenIssuedAtTimestamp = Number(tokenIssuedAt) * 1000;
        if (tokenIssuedAtTimestamp < passwordChangedAtTimestamp) {
          throw new UnauthorizedException(
            'Password was changed after this token was issued. Please request a new password reset.',
          );
        }
      }
    }
    else if (data.currentPassword && userId) {
      const userWithId = await this.usersService.getUserById(userId);
      if (!userWithId) {
        throw new NotFoundException('User', userId);
      }

      user = await this.usersService.findOneByEmail(userWithId.email);
      if (!user) {
        throw new NotFoundException('User', userWithId.email);
      }

      const isMatch = await bcrypt.compare(
        data.currentPassword,
        user.passwordHash,
      );
      if (!isMatch) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    } else {
      throw new BadRequestException(
        'Either token (for password reset) or currentPassword (for password change) is required',
      );
    }

    const passwordHashed = await bcrypt.hash(data.password, 10);
    const result = await this.usersService.resetPassword(
      user.email,
      passwordHashed,
    );
    return result;
  }
  private async decodeResetPasswordTokenToEmail(token: string) {
    let payload: PasswordResetTokenPayload;
    try {
      payload = await this.jwtService.verify(token, {
        secret: this.configService.get('JWT_PASSWORD_RESET_SECRET'),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new BadRequestException('Password reset token expired');
      }
      throw new BadRequestException('Invalid or malformed confirmation token');
    }
    if (typeof payload === 'object' && 'email' in payload && 'iat' in payload) {
      return {
        email: payload.email,
        tokenIssuedAt: payload.iat as string,
      };
    }
    throw new BadRequestException('Invalid token payload');
  }
  private async decodeVerifyUserTokenToId(token: string) {
    let payload: UserVerifyTokenPayload;
    try {
      payload = await this.jwtService.verify(token, {
        secret: this.configService.get('JWT_USER_VERIFY_SECRET'),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new BadRequestException('User verification token expired');
      }
      throw new BadRequestException('Invalid or malformed confirmation token');
    }
    if (typeof payload === 'object' && 'subb' in payload) {
      return payload.subb;
    }
    throw new BadRequestException('Invalid token payload');
  }
}
