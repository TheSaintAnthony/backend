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
    {
      name: 'Standard',
      nameEn: 'Standard',
      nameFr: 'Standard',
      nameDe: 'Standard',
      maxCapacity: 2,
    },
    {
      name: 'Superior',
      nameEn: 'Superior',
      nameFr: 'Supérieur',
      nameDe: 'Superior',
      maxCapacity: 3,
    },
    {
      name: 'Suite',
      nameEn: 'Suite',
      nameFr: 'Suite',
      nameDe: 'Suite',
      maxCapacity: 4,
    },
    {
      name: 'Deluxe',
      nameEn: 'Deluxe',
      nameFr: 'Deluxe',
      nameDe: 'Deluxe',
      maxCapacity: 2,
    },
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
          nameEn: rt.nameEn,
          nameFr: rt.nameFr,
          nameDe: rt.nameDe,
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
        name: 'Hotel The St. Anthony',
        nameEn: 'The St. Anthony Hotel',
        nameFr: 'Hôtel The St. Anthony',
        nameDe: 'The St. Anthony Hotel',
        description:
          'Um hotel boutique de luxo no coração de Lisboa.',
        descriptionEn: 'A boutique luxury hotel in the heart of Lisbon.',
        descriptionFr:
          'Un hôtel boutique de luxe au cœur de Lisbonne.',
        descriptionDe: 'Ein Boutique-Luxushotel im Herzen von Lissabon.',
        about:
          'Situado no histórico bairro do Chiado, o Hotel The St. Anthony oferece uma mistura refinada de arquitetura portuguesa clássica e conforto contemporâneo.',
        aboutEn:
          'Nestled in the historic Chiado neighbourhood, The St. Anthony Hotel offers a refined blend of classic Portuguese architecture and contemporary comfort.',
        aboutFr:
          'Situé dans le quartier historique du Chiado, The St. Anthony Hotel offre un mélange raffiné d\'architecture portugaise classique et de confort contemporain.',
        aboutDe:
          'Eingebettet in der historischen Chiado-Nachbarschaft bietet The St. Anthony Hotel eine raffinierte Mischung aus klassischer portugiesischer Architektur und zeitgenössischem Komfort.',
        addressId: addressHotel[0].id,
        email: 'hotel@thesaintanthony.com',
        phoneNumber: '+351291600300',
        checkInTime: '15:00',
        checkOutTime: '11:00',
        tourismFee: '2.00',
        arrivalInstructions:
          'A receção está aberta 24 horas. Estacione na Praça do Comércio e caminhe 5 minutos para norte.',
        arrivalInstructionsEn:
          'Reception is open 24 hours. Park in Praça do Comércio and walk 5 minutes north.',
        arrivalInstructionsFr:
          'Réception ouverte 24h/24. Garez-vous à la Praça do Comércio et marchez 5 minutes vers le nord.',
        arrivalInstructionsDe:
          'Rezeption 24 Stunden geöffnet. Parken Sie am Praça do Comércio und gehen Sie 5 Minuten nach Norden.',
      })
      .returning();
  }

  // ── Rooms ──────────────────────────────────────────────────────────────────

  const roomsData = [
    {
      name: 'Quarto Standard',
      nameEn: 'Standard Room',
      nameFr: 'Chambre Standard',
      nameDe: 'Standardzimmer',
      description: 'Um quarto confortável com vista sobre a cidade.',
      descriptionEn: 'A comfortable room with a city view.',
      descriptionFr: 'Une chambre confortable avec vue sur la ville.',
      descriptionDe: 'Ein komfortables Zimmer mit Stadtblick.',
      bedCount: 1,
      bathroomCount: 1,
      quantity: 5,
      roomTypeName: 'Standard',
    },
    {
      name: 'Duplo Superior',
      nameEn: 'Superior Double',
      nameFr: 'Double Supérieure',
      nameDe: 'Superior Doppelzimmer',
      description:
        'Quarto espaçoso com cama de casal e vista sobre o jardim.',
      descriptionEn: 'Spacious room with double bed and garden view.',
      descriptionFr: 'Chambre spacieuse avec lit double et vue sur le jardin.',
      descriptionDe: 'Geräumiges Zimmer mit Doppelbett und Gartenblick.',
      bedCount: 1,
      bathroomCount: 1,
      quantity: 4,
      roomTypeName: 'Superior',
    },
    {
      name: 'Suite Júnior',
      nameEn: 'Junior Suite',
      nameFr: 'Suite Junior',
      nameDe: 'Junior Suite',
      description:
        'Suite elegante com área de estar separada e vistas panorâmicas.',
      descriptionEn:
        'Elegant suite with separate living area and panoramic views.',
      descriptionFr:
        'Suite élégante avec espace de vie séparé et vues panoramiques.',
      descriptionDe:
        'Elegante Suite mit separatem Wohnbereich und Panoramablick.',
      bedCount: 1,
      bathroomCount: 2,
      quantity: 2,
      roomTypeName: 'Suite',
    },
    {
      name: 'Duplo Deluxe',
      nameEn: 'Deluxe Twin',
      nameFr: 'Chambre Double Deluxe',
      nameDe: 'Deluxe Zweibettzimmer',
      description: 'Quarto duplo com amenities de luxo e varanda.',
      descriptionEn: 'Twin room with deluxe amenities and balcony.',
      descriptionFr: 'Chambre double avec commodités de luxe et balcon.',
      descriptionDe: 'Zweibettzimmer mit Deluxe-Ausstattung und Balkon.',
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
          nameEn: room.nameEn,
          nameFr: room.nameFr,
          nameDe: room.nameDe,
          description: room.description,
          descriptionEn: room.descriptionEn,
          descriptionFr: room.descriptionFr,
          descriptionDe: room.descriptionDe,
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
        name: 'Residências The St. Anthony',
        nameEn: 'The St. Anthony Residences',
        nameFr: 'Résidences The St. Anthony',
        nameDe: 'The St. Anthony Residences',
        description:
          'Apartamentos de luxo com serviço para estadias prolongadas no centro de Lisboa.',
        descriptionEn:
          'Luxury serviced apartments for extended stays in central Lisbon.',
        descriptionFr:
          'Appartements de luxe avec service pour longs séjours au centre de Lisbonne.',
        descriptionDe:
          'Luxus-Servicewohnungen für längere Aufenthalte im Zentrum von Lissabon.',
        about:
          'As nossas residências combinam a privacidade de uma casa particular com os serviços de um hotel cinco estrelas, a poucos passos dos monumentos mais emblemáticos de Lisboa.',
        aboutEn:
          "Our residences combine the privacy of a private home with the services of a five-star hotel, located steps away from Lisbon's most iconic landmarks.",
        aboutFr:
          "Nos résidences allient l'intimité d'une maison privée aux services d'un hôtel cinq étoiles, à quelques pas des monuments les plus emblématiques de Lisbonne.",
        aboutDe:
          "Unsere Residenzen verbinden die Privatsphäre eines Eigenheims mit dem Service eines Fünf-Sterne-Hotels, nur wenige Schritte von Lissabons bekanntesten Wahrzeichen entfernt.",
        addressId: addressResidence[0].id,
        email: 'residences@thesaintanthony.com',
        phoneNumber: '+351291600301',
      })
      .returning();
  }

  // ── Residence Units ────────────────────────────────────────────────────────

  const residenceUnitsData = [
    {
      name: 'Unidade A101',
      nameEn: 'Unit A101',
      nameFr: 'Unité A101',
      nameDe: 'Einheit A101',
      typology: 'T1',
      price: '1500.00',
      area: '65.00',
      floor: 1,
      status: 'available',
      description:
        'Apartamento T1 moderno com varanda com vista sobre a cidade.',
      descriptionEn: 'Modern T1 apartment with balcony overlooking the city.',
      descriptionFr: 'Appartement T1 moderne avec balcon donnant sur la ville.',
      descriptionDe: 'Modernes T1-Apartment mit Balkon und Stadtblick.',
      bedroomCount: 1,
      bathroomCount: 1,
    },
    {
      name: 'Unidade A202',
      nameEn: 'Unit A202',
      nameFr: 'Unité A202',
      nameDe: 'Einheit A202',
      typology: 'T2',
      price: '2200.00',
      area: '95.00',
      floor: 2,
      status: 'available',
      description:
        'Apartamento T2 espaçoso com sala de estar e refeitório separados.',
      descriptionEn:
        'Spacious T2 apartment with separate living and dining areas.',
      descriptionFr:
        'Spacieux appartement T2 avec séjour et salle à manger séparés.',
      descriptionDe:
        'Geräumiges T2-Apartment mit separatem Wohn- und Essbereich.',
      bedroomCount: 2,
      bathroomCount: 2,
    },
    {
      name: 'Unidade A303',
      nameEn: 'Unit A303',
      nameFr: 'Unité A303',
      nameDe: 'Einheit A303',
      typology: 'T3',
      price: '3000.00',
      area: '140.00',
      floor: 3,
      status: 'reserved',
      description:
        'Apartamento T3 de luxo com acabamentos premium e acesso ao jardim.',
      descriptionEn:
        'Luxury T3 apartment with premium finishes and garden access.',
      descriptionFr:
        'Appartement T3 de luxe avec finitions premium et accès au jardin.',
      descriptionDe:
        'Luxus-T3-Apartment mit Premium-Ausstattung und Gartenzugang.',
      bedroomCount: 3,
      bathroomCount: 2,
    },
    {
      name: 'Unidade B104',
      nameEn: 'Unit B104',
      nameFr: 'Unité B104',
      nameDe: 'Einheit B104',
      typology: 'T2',
      price: '2100.00',
      area: '90.00',
      floor: 1,
      status: 'available',
      description:
        'Apartamento T2 luminoso no rés-do-chão com pátio.',
      descriptionEn: 'Bright T2 apartment on the ground floor with patio.',
      descriptionFr: 'Appartement T2 lumineux au rez-de-chaussée avec patio.',
      descriptionDe: 'Helles T2-Apartment im Erdgeschoss mit Patio.',
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
        nameEn: unit.nameEn,
        nameFr: unit.nameFr,
        nameDe: unit.nameDe,
        typology: unit.typology,
        price: unit.price,
        area: unit.area,
        floor: unit.floor,
        status: unit.status,
        description: unit.description,
        descriptionEn: unit.descriptionEn,
        descriptionFr: unit.descriptionFr,
        descriptionDe: unit.descriptionDe,
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
      nameEn: 'Terreiro do António',
      nameFr: 'Terreiro do António',
      nameDe: 'Terreiro do António',
      description:
        'Gastronomia refinada com vistas deslumbrantes sobre o rio Tejo.',
      descriptionEn: 'Fine dining with breathtaking views over the Tagus river.',
      descriptionFr:
        'Gastronomie raffinée avec une vue imprenable sur le fleuve Tage.',
      descriptionDe: 'Feines Essen mit atemberaubendem Blick auf den Tejo.',
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
      nameEn: 'Bar de São Bento',
      nameFr: 'Bar de São Bento',
      nameDe: 'Bar de São Bento',
      description:
        'Um bar de cocktails acolhedor com uma seleção curada de vinhos e espíritos portugueses.',
      descriptionEn:
        'A cozy cocktail bar with a curated selection of Portuguese wines and spirits.',
      descriptionFr:
        'Un bar à cocktails chaleureux avec une sélection de vins et spiritueux portugais.',
      descriptionDe:
        'Eine gemütliche Cocktailbar mit einer kuratierten Auswahl portugiesischer Weine und Spirituosen.',
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
      titleEn: 'Receptionist',
      titleFr: 'Réceptionniste',
      titleDe: 'Empfangsmitarbeiter',
      location: 'Lisboa, Portugal',
      type: 'Full-time',
      department: 'Front Office',
      description:
        'Procuramos um(a) rececionista dinâmico(a) para integrar a nossa equipa. Responsabilidades incluem check-in/check-out de hóspedes, gestão de reservas e atendimento ao cliente.',
      descriptionEn:
        'We are looking for a dynamic receptionist to join our team. Responsibilities include guest check-in/check-out, reservation management and customer service.',
      descriptionFr:
        'Nous recherchons un(e) réceptionniste dynamique pour rejoindre notre équipe. Responsabilités : enregistrement des clients, gestion des réservations et service client.',
      descriptionDe:
        'Wir suchen einen dynamischen Empfangsmitarbeiter für unser Team. Zu den Aufgaben gehören Check-in/Check-out, Reservierungsverwaltung und Kundenservice.',
    },
    {
      title: 'Chefe de Cozinha',
      titleEn: 'Head Chef',
      titleFr: 'Chef Cuisinier',
      titleDe: 'Küchenchef',
      location: 'Lisboa, Portugal',
      type: 'Full-time',
      department: 'Restauração',
      description:
        'Oportunidade para um(a) Chefe de Cozinha experiente liderar a nossa equipa culinária e desenvolver menus inovadores com produtos regionais.',
      descriptionEn:
        'Opportunity for an experienced Head Chef to lead our culinary team and develop innovative menus with regional products.',
      descriptionFr:
        'Opportunité pour un Chef Cuisinier expérimenté de diriger notre équipe culinaire et développer des menus innovants avec des produits régionaux.',
      descriptionDe:
        'Gelegenheit für einen erfahrenen Küchenchef, unser Küchenteam zu leiten und innovative Menüs mit regionalen Produkten zu entwickeln.',
    },
    {
      title: 'Assistente de F&B',
      titleEn: 'F&B Assistant',
      titleFr: 'Assistant F&B',
      titleDe: 'F&B-Assistent',
      location: 'Lisboa, Portugal',
      type: 'Part-time',
      department: 'Food & Beverage',
      description:
        'Apoio às operações diárias do restaurante e bar, incluindo serviço ao cliente, preparação de mesas e suporte à equipa.',
      descriptionEn:
        'Support daily restaurant and bar operations, including customer service, table preparation and team support.',
      descriptionFr:
        'Soutien aux opérations quotidiennes du restaurant et du bar, incluant le service client, la préparation des tables et le soutien à l\'équipe.',
      descriptionDe:
        'Unterstützung der täglichen Restaurant- und Barbetriebe, einschließlich Kundenservice, Tischvorbereitung und Teamunterstützung.',
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
        titleEn: job.titleEn,
        titleFr: job.titleFr,
        titleDe: job.titleDe,
        location: job.location,
        type: job.type,
        department: job.department,
        description: job.description,
        descriptionEn: job.descriptionEn,
        descriptionFr: job.descriptionFr,
        descriptionDe: job.descriptionDe,
        isActive: true,
      });
    }
  }
}
