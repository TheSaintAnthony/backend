# Booking API

## Overview

The booking system automates the entire reservation process in a single API call. It handles multiple rooms per reservation, calculates variable pricing per night, and manages all related records (invoices, payments, etc).

## ✅ Room Hold System (Race Condition Protection)

The system implements **temporary holds** to prevent double-booking race conditions.

### How It Works

1. **Get Price Quote** → Creates a 10-minute hold on requested rooms (if user is authenticated)
2. **Availability Check** → Respects active holds from other users
3. **Complete Booking** → Requires valid hold, releases hold after confirmation
4. **Hold Expiration** → Holds automatically expire after 10 minutes

### Hold Lifecycle

```
User A requests quote → Hold created (expires in 10min)
User B checks same room → Sees "not available"
User A completes booking → Hold released, reservation confirmed
User B checks again → Now available

OR

User A requests quote → Hold created (expires in 10min)
User A abandons → Hold expires automatically
User B checks room → Available again
```

### Database Table

The `room_holds` table tracks temporary reservations:
- `userId` - Who holds the room
- `roomId` - Which room is held
- `checkIn/checkOut` - Date range
- `expiresAt` - When hold automatically releases
- `createdAt` - When hold was created

### Cleanup

Run `roomHoldsService.cleanupExpiredHolds()` periodically (recommended: every 5 minutes via cron). Returns count of deleted holds.

To set up automatic cleanup:
1. Install: `yarn add @nestjs/schedule`
2. Import `ScheduleModule` in `AppModule`
3. Create a cron service (example in `src/room-holds/room-holds.cron.example.ts`)

## Endpoints

### 1. Check Availability
```
POST /reservations/check-availability
```
**Body:**
```json
{
  "roomId": 1,
  "checkIn": "2025-12-15",
  "checkOut": "2025-12-20"
}
```

### 2. Get Price Quote
```
POST /reservations/quote
```
**Body:**
```json
{
  "rooms": [
    {
      "roomId": 1,
      "checkIn": "2025-12-15",
      "checkOut": "2025-12-20"
    },
    {
      "roomId": 2,
      "checkIn": "2025-12-15",
      "checkOut": "2025-12-20"
    }
  ]
}
```
**Response:**
```json
{
  "rooms": [
    {
      "roomId": 1,
      "checkIn": "2025-12-15",
      "checkOut": "2025-12-20",
      "nights": 5,
      "avgPricePerNight": "150.00",
      "roomTotal": "750.00",
      "available": true
    }
  ],
  "totalPrice": "750.00",
  "allAvailable": true,
  "message": "All rooms are available for the selected dates"
}
```

### 3. Complete Booking
```
POST /reservations/booking
```
**Body:**
```json
{
  "userId": 1,
  "rooms": [
    {
      "roomId": 1,
      "checkIn": "2025-12-15",
      "checkOut": "2025-12-20",
      "guestsCount": 2
    }
  ],
  "specialRequests": "Late check-in",
  "paymentMethodId": 1,
  "transactionId": "PAYPAL_123456"
}
```
**Response:**
```json
{
  "success": true,
  "reservation": {
    "id": 1,
    "userId": 1,
    "statusId": 2,
    "totalPrice": "750.00",
    "paymentStatusId": 2
  },
  "invoice": {
    "id": 1,
    "reservationId": 1,
    "amount": "750.00",
    "statusId": 2
  },
  "totalPrice": "750.00",
  "message": "Booking completed successfully"
}
```

## Key Features

- **Multiple Rooms**: Book multiple rooms with different dates in one reservation
- **Variable Pricing**: Calculates price per night (handles different prices across date ranges)
- **Automatic Processing**: Creates reservation, invoice, payment receipt automatically
- **Rollback on Error**: If anything fails, all changes are rolled back
- **Address from Signup**: Uses the address provided during user registration for billing

## User Flow

1. User registers → `POST /auth/signup` (includes address)
2. User signs in → `POST /auth/signin`
3. Browse properties → `GET /properties`
4. View rooms → `GET /rooms?propertyId=1`
5. Get price quote → `POST /reservations/quote`
6. User pays via PayPal (frontend)
7. Complete booking → `POST /reservations/booking` (with PayPal transaction ID)
8. Reservation confirmed

## Price Calculation

The system calculates price **per night** individually. If a booking spans multiple price ranges:

**Example:**
- Dec 15-17: $100/night (weekend)
- Dec 18-20: $80/night (weekday)
- Total: (2 × $100) + (2 × $80) = $360

The `avgPricePerNight` in the quote is simply `totalPrice / nights` for display purposes.

## Setting Up Cron Job (Optional but Recommended)

To automatically clean up expired holds:

1. Install NestJS Schedule:
```bash
npm install @nestjs/schedule
```

2. Import ScheduleModule in AppModule:
```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ... other modules
  ],
})
```

3. Use the example cron service in `src/room-holds/room-holds.cron.example.ts`

This runs every 5 minutes and removes expired holds from the database.

