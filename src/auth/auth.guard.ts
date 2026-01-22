import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UnauthorizedException } from 'src/filters';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthenticatedRequest, JwtPayload } from './interfaces';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator';
import { IS_OPTIONAL_AUTH_KEY } from 'src/decorators/optional-auth.decorator';
import { UsersService } from 'src/users/users.service';
import { UserRole } from 'src/constants';
@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private jwtService: JwtService,
		private reflector: Reflector,
		private usersService: UsersService,
	) { }
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) {
			return true;
		}

		const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(
			IS_OPTIONAL_AUTH_KEY,
			[context.getHandler(), context.getClass()],
		);

		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
		const token = this.extractTokenFromHeader(request);

		if (isOptionalAuth && !token) {
			return true;
		}

		if (!token) {
			throw new UnauthorizedException('No authentication token provided');
		}

		try {
			const payload: JwtPayload = await this.jwtService.verifyAsync(token, {
				secret: process.env.JWT_SECRET!,
			});

			const userFromDb = await this.usersService.getUserById(payload.sub);
			const dbRoles = userFromDb.roles.map((role) => 
				String(role.name) === String(UserRole.ADMIN) ? UserRole.ADMIN : UserRole.USER
			);

			const tokenRoles = [...payload.roles].sort();
			const currentRoles = [...dbRoles].sort();

			const rolesMatch = 
				tokenRoles.length === currentRoles.length &&
				tokenRoles.every((role, index) => role === currentRoles[index]);

			if (!rolesMatch) {
				throw new UnauthorizedException(
					'Your roles have changed. Please log in again to refresh your permissions.'
				);
			}

			request.user = payload;
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}
			throw new UnauthorizedException('Invalid or expired token');
		}

		return true;
	}

	private extractTokenFromHeader(request: Request): string | undefined {
		const [type, token] = request.headers.authorization?.split(' ') ?? [];
		return type === 'Bearer' ? token : undefined;
	}
}
