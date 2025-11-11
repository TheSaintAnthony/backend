/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { UsersService } from './../src/users/users.service';

describe('Booking Flow (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: number;
  let propertyId: number;
  let roomId: number;
  let reservationId: number;
  let invoiceId: number;
  let paymentMethodId: number;

  const testUser = {
    firstName: 'John',
    lastName: 'Doe',
    email: `test.user.${Date.now()}@example.com`,
    password: 'TestPassword123!',
    phone: '+1234567890',
    address: {
      street: '123 Main St',
      city: 'New York',
      zipCode: '10001',
      country: 'USA',
    },
  };

  const bookingDates = {
    checkIn: '2025-12-20',
    checkOut: '2025-12-25',
  };

  const finalBookingDates = {
    checkIn: '2027-06-15',
    checkOut: '2027-06-20',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. User Registration & Authentication', () => {
    it('should sign up a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(testUser)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.firstName).toBe(testUser.firstName);
      expect(response.body.lastName).toBe(testUser.lastName);

      userId = response.body.id;
    });

    it('should fail to sign in without verification', async () => {
      await request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);
    });

    it('should manually verify user for testing', async () => {
      const usersService = app.get(UsersService);
      await usersService.verifyUser(userId);
    });

    it('should sign in with the verified user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');

      authToken = response.body.access_token;
    });

    it('should fail to sign in with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });
  });

  describe('2. Browse Properties', () => {
    it('should get all properties (public endpoint)', async () => {
      const response = await request(app.getHttpServer())
        .get('/properties')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Store the first property for testing
      propertyId = response.body[0].id;
      expect(propertyId).toBeDefined();
    });

    it('should get a specific property by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/properties/${propertyId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', propertyId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
    });
  });

  describe('3. Browse Rooms', () => {
    it('should get all rooms for the selected property', async () => {
      const response = await request(app.getHttpServer())
        .get(`/rooms?propertyId=${propertyId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      roomId = response.body[0].id;
      expect(roomId).toBeDefined();
    });

    it('should get a specific room by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/rooms/${roomId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', roomId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
      // Note: The response may include amenities, highlights, etc.
    });
  });

  describe('4. Check Availability', () => {
    it('should check if room is available for the selected dates', async () => {
      const response = await request(app.getHttpServer())
        .post('/rooms/availability')
        .send({
          roomId,
          checkIn: bookingDates.checkIn,
          checkOut: bookingDates.checkOut,
        })
        .expect(201); // POST endpoints typically return 201

      expect(response.body).toHaveProperty('available');

      // If not available, we'll need to adjust dates or find another room
      if (!response.body.available) {
        console.warn('Room not available for selected dates, test may fail');
      }
    });

    it('should handle check availability with invalid dates gracefully', async () => {
      await request(app.getHttpServer())
        .post('/rooms/availability')
        .send({
          roomId,
          checkIn: '2025-12-25',
          checkOut: '2025-12-20', // Check-out before check-in
        })
        .expect(201);

      // The service should ideally validate and return available: false or throw an error
      // For now, we just check it doesn't crash
    });
  });

  describe('5. Get Price Quote', () => {
    it('should get a price quote for the selected room and dates (authenticated)', async () => {
      const response = await request(app.getHttpServer())
        .post('/rooms/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rooms: [
            {
              roomId,
              checkIn: bookingDates.checkIn,
              checkOut: bookingDates.checkOut,
            },
          ],
        })
        .expect(201);

      expect(response.body).toHaveProperty('rooms');
      expect(Array.isArray(response.body.rooms)).toBe(true);
      expect(response.body.rooms.length).toBe(1);
      expect(response.body.rooms[0]).toHaveProperty('roomId', roomId);
      expect(response.body.rooms[0]).toHaveProperty('roomTotal');
      expect(response.body.rooms[0]).toHaveProperty('nights');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('tax');
      expect(response.body.rooms[0]).toHaveProperty('available');
    });

    it('should fail to get quote without authentication', async () => {
      await request(app.getHttpServer())
        .post('/rooms/quotes')
        .send({
          rooms: [
            {
              roomId,
              checkIn: bookingDates.checkIn,
              checkOut: bookingDates.checkOut,
            },
          ],
        })
        .expect(401);
    });
  });

  describe('6. Get Payment Methods', () => {
    it('should get all available payment methods', async () => {
      const response = await request(app.getHttpServer())
        .get('/payment/methods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Find PayPal payment method (or use the first one)
      const paypalMethod = response.body.find(
        (method: { name: string }) => method.name === 'PayPal',
      );
      paymentMethodId = paypalMethod ? paypalMethod.id : response.body[0].id;

      expect(paymentMethodId).toBeDefined();
    });
  });

  describe('7. Create Booking with Payment', () => {
    it('should create a complete booking with payment', async () => {
      // First, get a price quote to create a room hold
      // This is required before creating a booking
      // Use different dates to avoid conflicts with previous price quote tests
      await request(app.getHttpServer())
        .post('/rooms/quotes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rooms: [
            {
              roomId,
              checkIn: finalBookingDates.checkIn,
              checkOut: finalBookingDates.checkOut,
            },
          ],
        })
        .expect(201);

      // Now create the booking (must be done shortly after the price quote)
      const response = await request(app.getHttpServer())
        .post('/reservations/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rooms: [
            {
              roomId,
              checkIn: finalBookingDates.checkIn,
              checkOut: finalBookingDates.checkOut,
              guestsCount: 2,
            },
          ],
          specialRequests: 'Late check-in required',
          paymentMethodId,
          transactionId: `test_txn_${Date.now()}`,
        });

      // Log the response for debugging if it fails
      if (response.status !== 201) {
        console.error('Booking failed with status:', response.status);
        console.error('Response body:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty('reservation');
      expect(response.body.reservation).toHaveProperty('id');
      expect(response.body.reservation).toHaveProperty('userId', userId);
      expect(response.body).toHaveProperty('invoice');
      expect(response.body.invoice).toHaveProperty('id');
      expect(response.body).toHaveProperty('payment');
      expect(response.body.payment).toHaveProperty('id');

      reservationId = response.body.reservation.id;
      invoiceId = response.body.invoice.id;

      expect(reservationId).toBeDefined();
      expect(invoiceId).toBeDefined();
    });

    it('should fail to create booking without authentication', async () => {
      await request(app.getHttpServer())
        .post('/reservations/bookings')
        .send({
          rooms: [
            {
              roomId,
              checkIn: bookingDates.checkIn,
              checkOut: bookingDates.checkOut,
              guestsCount: 2,
            },
          ],
          paymentMethodId,
          transactionId: `test_txn_${Date.now()}`,
        })
        .expect(401);
    });

    it('should fail to create booking with invalid room ID', async () => {
      await request(app.getHttpServer())
        .post('/reservations/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rooms: [
            {
              roomId: 999999, // Non-existent room
              checkIn: bookingDates.checkIn,
              checkOut: bookingDates.checkOut,
              guestsCount: 2,
            },
          ],
          paymentMethodId,
          transactionId: `test_txn_${Date.now()}`,
        })
        .expect(404);
    });
  });

  describe('8. Verify Reservation', () => {
    it('should get the created reservation', async () => {
      const response = await request(app.getHttpServer())
        .get(`/reservations/${reservationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', reservationId);
      expect(response.body).toHaveProperty('userId', userId);
      expect(response.body).toHaveProperty('status');
    });

    it('should get all reservations for the user', async () => {
      const response = await request(app.getHttpServer())
        .get('/reservations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const createdReservation = response.body.find(
        (r: { id: number }) => r.id === reservationId,
      );
      expect(createdReservation).toBeDefined();
    });
  });

  describe('9. Get Invoice', () => {
    it('should get the invoice by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', invoiceId);
      expect(response.body).toHaveProperty('reservationId', reservationId);
      expect(response.body).toHaveProperty('subtotal');
      expect(response.body).toHaveProperty('tax');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('status');
    });

    it('should get invoices for the reservation', async () => {
      const response = await request(app.getHttpServer())
        .get(`/invoices?reservationId=${reservationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const invoice = response.body.find(
        (i: { id: number }) => i.id === invoiceId,
      );
      expect(invoice).toBeDefined();
      expect(invoice.reservationId).toBe(reservationId);
    });

    it('should get all invoices', async () => {
      const response = await request(app.getHttpServer())
        .get('/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('10. Get Payments', () => {
    it('should get payments for the invoice', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payments?invoiceId=${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const payment = response.body[0];
      expect(payment).toHaveProperty('invoiceId', invoiceId);
      expect(payment).toHaveProperty('paymentMethodId', paymentMethodId);
      expect(payment).toHaveProperty('amount');
      expect(payment).toHaveProperty('status');
    });
  });

  describe('11. Complete Flow Validation', () => {
    it('should have created all related entities correctly', async () => {
      // Verify the entire chain of entities exists and is related
      const reservationResponse = await request(app.getHttpServer())
        .get(`/reservations/${reservationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const invoiceResponse = await request(app.getHttpServer())
        .get(`/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const paymentsResponse = await request(app.getHttpServer())
        .get(`/payments?invoiceId=${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify relationships
      expect(reservationResponse.body.id).toBe(reservationId);
      expect(reservationResponse.body.userId).toBe(userId);

      expect(invoiceResponse.body.id).toBe(invoiceId);
      expect(invoiceResponse.body.reservationId).toBe(reservationId);

      expect(paymentsResponse.body.length).toBeGreaterThan(0);
      expect(paymentsResponse.body[0].invoiceId).toBe(invoiceId);
    });

    it('should have correct booking dates in reservation rooms', async () => {
      const response = await request(app.getHttpServer())
        .get(`/reservations/${reservationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('reservationRooms');
      expect(Array.isArray(response.body.reservationRooms)).toBe(true);
      expect(response.body.reservationRooms.length).toBeGreaterThan(0);

      const reservationRoom = response.body.reservationRooms[0];
      expect(reservationRoom.roomId).toBe(roomId);
      expect(reservationRoom.checkIn).toContain(finalBookingDates.checkIn);
      expect(reservationRoom.checkOut).toContain(finalBookingDates.checkOut);
    });
  });

  describe('12. Edge Cases & Error Handling', () => {
    it('should not allow double booking the same room for overlapping dates', async () => {
      // Try to book the same room and dates that were already booked
      await request(app.getHttpServer())
        .post('/reservations/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rooms: [
            {
              roomId,
              checkIn: finalBookingDates.checkIn,
              checkOut: finalBookingDates.checkOut,
              guestsCount: 2,
            },
          ],
          paymentMethodId,
          transactionId: `test_txn_${Date.now()}`,
        })
        .expect(400); // Should fail due to existing reservation or no active hold
    });

    it('should validate required fields in signup', async () => {
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          firstName: 'Jane',
          // Missing required fields
        })
        .expect(400);
    });

    it('should validate date format in availability check', async () => {
      await request(app.getHttpServer())
        .post('/rooms/availability')
        .send({
          roomId,
          checkIn: 'invalid-date',
          checkOut: '2025-12-25',
        })
        .expect(400);
    });

    it('should require authentication for protected endpoints', async () => {
      // Test multiple protected endpoints
      await request(app.getHttpServer())
        .post('/reservations/bookings')
        .send({})
        .expect(401);

      await request(app.getHttpServer()).get('/reservations').expect(401);

      await request(app.getHttpServer())
        .post('/rooms/quotes')
        .send({})
        .expect(401);
    });
  });
});
