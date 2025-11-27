# Stripe Integration - Setup Guide

## Backend Setup

### 1. Environment Variables

Add the following to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook signing secret from Stripe Dashboard
```

### 2. Database Migration

Run the migration to add Stripe fields:

```bash
cd /Users/luismiranda/Documents/st-anthony
yarn db:migrate
```

This will add:
- `stripe_product_id` and `stripe_price_id` to `rooms` table
- `stripe_customer_id` to `users` table

### 3. Stripe Webhook Configuration

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/stripe/webhook`
3. Subscribe to events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Frontend Setup

### 1. Environment Variables

Add to your `.env.local` or `.env`:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key
```

### 2. Testing

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Requires 3D Secure: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 0002`

## Features Implemented

### Backend

1. **StripeService** - Complete Stripe integration:
   - PaymentIntent creation and confirmation
   - Customer management
   - Product and Price creation
   - Invoice creation
   - Webhook verification

2. **RoomsService** - Stripe product sync:
   - Create Stripe products when `createInStripe: true`
   - Create Stripe prices from room prices
   - Update Stripe products when rooms are edited

3. **ReservationsService** - Booking flow:
   - Creates PaymentIntent for bookings
   - Gets/creates Stripe customers
   - Returns `clientSecret` for frontend
   - Handles payment completion

4. **Webhook Handler** - Automatic status updates:
   - Updates payment status on `payment_intent.succeeded`
   - Updates reservation status automatically
   - Handles failed/canceled payments

### Frontend

1. **StripeProvider** - Stripe Elements wrapper
2. **StripePaymentForm** - Payment form component
3. **Checkout Page** - Updated to use Stripe
4. **Return Page** - Handles payment completion

## Usage

### Creating a Room with Stripe Product

When creating a room via API, include `createInStripe: true`:

```json
{
  "propertyId": "...",
  "name": "Ocean View Suite",
  "description": "...",
  "createInStripe": true
}
```

This will:
1. Create the room in your database
2. Create a Stripe Product
3. Create a Stripe Price (if room prices exist)
4. Store `stripeProductId` and `stripePriceId` in the room record

### Booking Flow

1. User fills out booking form
2. Frontend calls `/reservations/bookings` to create booking
3. Backend creates:
   - Reservation
   - Invoice
   - PaymentIntent
4. Frontend receives `clientSecret`
5. User completes payment via Stripe Elements
6. Webhook updates reservation status automatically

## Testing Checklist

- [ ] Run database migration
- [ ] Set environment variables
- [ ] Create a room with `createInStripe: true`
- [ ] Verify product appears in Stripe Dashboard
- [ ] Create a booking as a user
- [ ] Complete payment with test card
- [ ] Verify webhook updates reservation status
- [ ] Check invoice is created correctly

## Notes

- PayPal code has been removed from backend
- Payment method selection removed from frontend (Stripe only)
- Old PayPal return page remains but is deprecated
- All payments now go through Stripe PaymentIntents API

