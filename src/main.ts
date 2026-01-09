import { NestFactory } from '@nestjs/core';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import * as express from 'express';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, {
		logger: new ConsoleLogger({
			prefix: 'St. Anthony',
		}),
	});

	app.use('/stripe/webhook', express.raw({ type: 'application/json' }), (req: express.Request, res: express.Response, next: express.NextFunction) => {
		if (req.body && Buffer.isBuffer(req.body)) {
			(req as any).rawBody = req.body;
		}
		next();
	});

	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true,
		}),
	);
	const config = new DocumentBuilder()
		.setTitle('St. Anthony API')
		.setVersion('1.0.0')
		.addBearerAuth(
			{
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'JWT',
				name: 'Authorization',
				description: 'Enter your JWT token',
				in: 'header',
			},
			'access-token',
		)
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, document, {
		swaggerOptions: {
			persistAuthorization: true,
			tagsSorter: 'alpha',
			operationsSorter: 'alpha',
		},
		customSiteTitle: 'St. Anthony API Documentation',
	});
	app.enableCors({
		origin: [
			process.env.FRONTEND_URL! as string,
		],
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
		exposedHeaders: ['Content-Type'],
	});
	app.use(
		helmet({
			crossOriginResourcePolicy: { policy: 'cross-origin' },
			crossOriginEmbedderPolicy: false,
		}),
	);

	app.use(
		'/images',
		express.static(process.env.IMAGES_PATH! as string),
	);

	app.useGlobalFilters(new AllExceptionsFilter());
	await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
