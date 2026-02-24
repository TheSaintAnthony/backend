import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as schema from '../schema';
import { UserRole } from '../../constants/user-role.enum';

export async function seedDevData(db: NodePgDatabase<typeof schema>) {
  // ── Addresses ──────────────────────────────────────────────────────────────

  let addressHotel = await db
    .select()
    .from(schema.addresses)
    .where(eq(schema.addresses.street, 'Rua de São Bento 201'))
    .limit(1);

  if (addressHotel.length === 0) {
    addressHotel = await db
      .insert(schema.addresses)
      .values({
        street: 'Rua de São Bento 201',
        city: 'Lisboa',
        zipCode: '1200-821',
        country: 'Portugal',
      })
      .returning();
  }

  let addressResidence = await db
    .select()
    .from(schema.addresses)
    .where(eq(schema.addresses.street, 'Largo do Carmo 14'))
    .limit(1);

  if (addressResidence.length === 0) {
    addressResidence = await db
      .insert(schema.addresses)
      .values({
        street: 'Largo do Carmo 14',
        city: 'Lisboa',
        zipCode: '1200-092',
        country: 'Portugal',
      })
      .returning();
  }

  let addressRestaurant = await db
    .select()
    .from(schema.addresses)
    .where(eq(schema.addresses.street, 'Praça do Comércio 8'))
    .limit(1);

  if (addressRestaurant.length === 0) {
    addressRestaurant = await db
      .insert(schema.addresses)
      .values({
        street: 'Praça do Comércio 8',
        city: 'Lisboa',
        zipCode: '1100-148',
        country: 'Portugal',
      })
      .returning();
  }

  // ── Room Types ─────────────────────────────────────────────────────────────

  const roomTypeData = [
    { name: 'Standard', maxCapacity: 2 },
    { name: 'Superior', maxCapacity: 3 },
    { name: 'Suite', maxCapacity: 4 },
    { name: 'Deluxe', maxCapacity: 2 },
  ];

  const roomTypeIds: Record<string, string> = {};
  for (const rt of roomTypeData) {
    let existing = await db
      .select()
      .from(schema.roomTypes)
      .where(eq(schema.roomTypes.name, rt.name))
      .limit(1);

    if (existing.length === 0) {
      existing = await db
        .insert(schema.roomTypes)
        .values({
          name: rt.name,
          maxCapacity: rt.maxCapacity,
          isSystemManaged: false,
        })
        .returning();
    }
    roomTypeIds[rt.name] = existing[0].id;
  }

  // ── Properties ─────────────────────────────────────────────────────────────

  let property = await db
    .select()
    .from(schema.properties)
    .where(eq(schema.properties.email, 'hotel@thesaintanthony.com'))
    .limit(1);

  if (property.length === 0) {
    property = await db
      .insert(schema.properties)
      .values({
        name: 'The St. Anthony Hotel',
        description: 'A boutique luxury hotel in the heart of Lisbon.',
        about:
          'Nestled in the historic Chiado neighbourhood, The St. Anthony Hotel offers a refined blend of classic Portuguese architecture and contemporary comfort.',
        addressId: addressHotel[0].id,
        email: 'hotel@thesaintanthony.com',
        phoneNumber: '+351291600300',
        checkInTime: '15:00',
        checkOutTime: '11:00',
        tourismFee: '2.00',
        arrivalInstructions:
          'Reception is open 24 hours. Park in Praça do Comércio and walk 5 minutes north.',
      })
      .returning();
  }

  // ── Rooms ──────────────────────────────────────────────────────────────────

  const roomsData = [
    {
      name: 'Standard Room',
      description: 'A comfortable room with a city view.',
      bedCount: 1,
      bathroomCount: 1,
      quantity: 5,
      roomTypeName: 'Standard',
    },
    {
      name: 'Superior Double',
      description: 'Spacious room with double bed and garden view.',
      bedCount: 1,
      bathroomCount: 1,
      quantity: 4,
      roomTypeName: 'Superior',
    },
    {
      name: 'Junior Suite',
      description:
        'Elegant suite with separate living area and panoramic views.',
      bedCount: 1,
      bathroomCount: 2,
      quantity: 2,
      roomTypeName: 'Suite',
    },
    {
      name: 'Deluxe Twin',
      description: 'Twin room with deluxe amenities and balcony.',
      bedCount: 2,
      bathroomCount: 1,
      quantity: 3,
      roomTypeName: 'Deluxe',
    },
  ];

  for (const room of roomsData) {
    const existing = await db
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.name, room.name))
      .limit(1);

    if (existing.length === 0) {
      const [newRoom] = await db
        .insert(schema.rooms)
        .values({
          propertyId: property[0].id,
          roomTypeId: roomTypeIds[room.roomTypeName],
          name: room.name,
          description: room.description,
          bedCount: room.bedCount,
          bathroomCount: room.bathroomCount,
          quantity: room.quantity,
          available: true,
        })
        .returning();

      // Add a base price for 2025
      await db.insert(schema.roomPrices).values({
        roomId: newRoom.id,
        price:
          room.roomTypeName === 'Standard'
            ? '120.00'
            : room.roomTypeName === 'Superior'
              ? '160.00'
              : room.roomTypeName === 'Suite'
                ? '280.00'
                : '180.00',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });
    }
  }

  // ── Residences ─────────────────────────────────────────────────────────────

  let residence = await db
    .select()
    .from(schema.residences)
    .where(eq(schema.residences.email, 'residences@thesaintanthony.com'))
    .limit(1);

  if (residence.length === 0) {
    residence = await db
      .insert(schema.residences)
      .values({
        name: 'The St. Anthony Residences',
        description:
          'Luxury serviced apartments for extended stays in central Lisbon.',
        about:
          "Our residences combine the privacy of a private home with the services of a five-star hotel, located steps away from Lisbon's most iconic landmarks.",
        addressId: addressResidence[0].id,
        email: 'residences@thesaintanthony.com',
        phoneNumber: '+351291600301',
      })
      .returning();
  }

  // ── Residence Units ────────────────────────────────────────────────────────

  const residenceUnitsData = [
    {
      name: 'Unit A101',
      typology: 'T1',
      price: '1500.00',
      area: '65.00',
      floor: 1,
      status: 'available',
      description: 'Modern T1 apartment with balcony overlooking the city.',
      bedroomCount: 1,
      bathroomCount: 1,
    },
    {
      name: 'Unit A202',
      typology: 'T2',
      price: '2200.00',
      area: '95.00',
      floor: 2,
      status: 'available',
      description:
        'Spacious T2 apartment with separate living and dining areas.',
      bedroomCount: 2,
      bathroomCount: 2,
    },
    {
      name: 'Unit A303',
      typology: 'T3',
      price: '3000.00',
      area: '140.00',
      floor: 3,
      status: 'reserved',
      description:
        'Luxury T3 apartment with premium finishes and garden access.',
      bedroomCount: 3,
      bathroomCount: 2,
    },
    {
      name: 'Unit B104',
      typology: 'T2',
      price: '2100.00',
      area: '90.00',
      floor: 1,
      status: 'available',
      description: 'Bright T2 apartment on the ground floor with patio.',
      bedroomCount: 2,
      bathroomCount: 1,
    },
  ];

  for (const unit of residenceUnitsData) {
    const existing = await db
      .select()
      .from(schema.residenceUnits)
      .where(eq(schema.residenceUnits.name, unit.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.residenceUnits).values({
        residenceId: residence[0].id,
        name: unit.name,
        typology: unit.typology,
        price: unit.price,
        area: unit.area,
        floor: unit.floor,
        status: unit.status,
        description: unit.description,
        bedroomCount: unit.bedroomCount,
        bathroomCount: unit.bathroomCount,
      });
    }
  }

  // ── Restaurants ────────────────────────────────────────────────────────────

  const restaurant = await db
    .select()
    .from(schema.restaurants)
    .where(eq(schema.restaurants.email, 'restaurante@thesaintanthony.com'))
    .limit(1);

  if (restaurant.length === 0) {
    await db.insert(schema.restaurants).values({
      name: 'Terreiro do António',
      description: 'Fine dining with breathtaking views over the Tagus river.',
      addressId: addressRestaurant[0].id,
      email: 'restaurante@thesaintanthony.com',
      phoneNumber: '+351291600302',
      website: 'https://www.thesaintanthony.com/restaurante',
      openingHours: JSON.stringify({
        'Segunda-Sexta': '12:00 - 22:30',
        Sábado: '12:00 - 23:00',
        Domingo: '12:00 - 21:00',
      }),
      cuisineType: 'Portuguesa Contemporânea',
      priceRange: '€€€',
      capacity: 80,
    });
  }

  const restaurantBar = await db
    .select()
    .from(schema.restaurants)
    .where(eq(schema.restaurants.email, 'bar@thesaintanthony.com'))
    .limit(1);

  if (restaurantBar.length === 0) {
    await db.insert(schema.restaurants).values({
      name: 'Bar de São Bento',
      description:
        'A cozy cocktail bar with a curated selection of Portuguese wines and spirits.',
      email: 'bar@thesaintanthony.com',
      phoneNumber: '+351291600303',
      openingHours: JSON.stringify({
        'Segunda-Domingo': '17:00 - 02:00',
      }),
      cuisineType: 'Bar & Cocktails',
      priceRange: '€€',
      capacity: 40,
    });
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  // Look up role IDs
  const adminRole = await db
    .select()
    .from(schema.roles)
    .where(eq(schema.roles.name, UserRole.ADMIN))
    .limit(1);

  const userRole = await db
    .select()
    .from(schema.roles)
    .where(eq(schema.roles.name, UserRole.USER))
    .limit(1);

  if (adminRole.length === 0 || userRole.length === 0) {
    console.warn('Roles not found — run seed-static-lookups first.');
    return;
  }

  // Admin user
  const existingAdmin = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, 'admin@example.com'))
    .limit(1);

  if (existingAdmin.length === 0) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    const [newAdmin] = await db
      .insert(schema.users)
      .values({
        firstName: 'Admin',
        lastName: 'St. Anthony',
        email: 'admin@example.com',
        passwordHash,
        verifiedAt: new Date(),
      })
      .returning();

    await db.insert(schema.userRoles).values({
      userId: newAdmin.id,
      roleId: adminRole[0].id,
    });
  }

  // Normal user
  const existingUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, 'user@example.com'))
    .limit(1);

  if (existingUser.length === 0) {
    const passwordHash = await bcrypt.hash('user123', 10);
    const [newUser] = await db
      .insert(schema.users)
      .values({
        firstName: 'João',
        lastName: 'Silva',
        email: 'user@example.com',
        passwordHash,
        phone: '+351912345678',
        verifiedAt: new Date(),
      })
      .returning();

    await db.insert(schema.userRoles).values({
      userId: newUser.id,
      roleId: userRole[0].id,
    });
  }

  // ── Job Postings ───────────────────────────────────────────────────────────

  const jobPostingData = [
    {
      title: 'Rececionista',
      location: 'Lisboa, Portugal',
      type: 'Full-time',
      department: 'Front Office',
      description:
        'Procuramos um(a) rececionista dinâmico(a) para integrar a nossa equipa. Responsabilidades incluem check-in/check-out de hóspedes, gestão de reservas e atendimento ao cliente.',
    },
    {
      title: 'Chefe de Cozinha',
      location: 'Lisboa, Portugal',
      type: 'Full-time',
      department: 'Restauração',
      description:
        'Oportunidade para um(a) Chefe de Cozinha experiente liderar a nossa equipa culinária e desenvolver menus inovadores com produtos regionais.',
    },
    {
      title: 'Assistente de F&B',
      location: 'Lisboa, Portugal',
      type: 'Part-time',
      department: 'Food & Beverage',
      description:
        'Apoio às operações diárias do restaurante e bar, incluindo serviço ao cliente, preparação de mesas e suporte à equipa.',
    },
  ];

  for (const job of jobPostingData) {
    const existing = await db
      .select()
      .from(schema.jobPostings)
      .where(eq(schema.jobPostings.title, job.title))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.jobPostings).values({
        title: job.title,
        location: job.location,
        type: job.type,
        department: job.department,
        description: job.description,
        isActive: true,
      });
    }
  }
}
