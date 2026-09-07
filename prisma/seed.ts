import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const password = 'Parkly123*';

async function user(
  email: string,
  data: {
    firstName: string;
    lastName: string;
    role: Role;
    complexId?: string;
    phone?: string;
  },
) {
  return prisma.user.upsert({
    where: { email },
    update: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role,
      complexId: data.complexId,
    },
    create: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role,
      complexId: data.complexId,
    },
  });
}

async function seedComplex(index: number, planId: string): Promise<void> {
  const name = index === 1 ? 'Conjunto Los Nogales' : 'Reserva del Parque';
  let complex = await prisma.complex.findFirst({ where: { name } });
  if (!complex)
    complex = await prisma.complex.create({
      data: {
        name,
        address: `Carrera ${15 + index * 10} # ${80 + index}-20`,
        city: 'Bogotá D.C.',
        phone: `60155510${index}0`,
        email: `contacto${index}@parkly.test`,
        numberOfApartments: 4,
        settings: { create: { reservationsEnabled: true, maxReservationHours: 8 } },
      },
    });
  const subscription = await prisma.subscription.findFirst({
    where: { complexId: complex.id, status: 'ACTIVE' },
  });
  if (!subscription)
    await prisma.subscription.create({
      data: {
        complexId: complex.id,
        planId,
        startDate: new Date('2026-01-01'),
        nextBillingDate: new Date('2026-10-01'),
        minimumCommitmentMonths: 6,
      },
    });

  const admin = await user(`admin${index}@parkly.test`, {
    firstName: index === 1 ? 'Camila' : 'Andrés',
    lastName: index === 1 ? 'Rodríguez' : 'Martínez',
    role: Role.ADMIN,
    complexId: complex.id,
    phone: '3005550101',
  });
  const security = await user(`seguridad${index}@parkly.test`, {
    firstName: 'Carlos',
    lastName: `Vigilante ${index}`,
    role: Role.SECURITY,
    complexId: complex.id,
    phone: '3105550101',
  });

  const apartments = await Promise.all(
    ['101', '102', '201', '202'].map((number) =>
      prisma.apartment.upsert({
        where: {
          complexId_tower_number: { complexId: complex!.id, tower: 'Torre 1', number },
        },
        update: {},
        create: {
          complexId: complex!.id,
          tower: 'Torre 1',
          number,
          floor: number.slice(0, 1),
        },
      }),
    ),
  );
  const residents = [];
  for (const [position, apartment] of apartments.slice(0, 3).entries()) {
    const residentUser = await user(`residente${index}${position + 1}@parkly.test`, {
      firstName: ['Laura', 'Mateo', 'Valentina'][position],
      lastName: ['Gómez', 'López', 'Pérez'][position],
      role: Role.RESIDENT,
      complexId: complex.id,
      phone: `32055501${index}${position}`,
    });
    const resident = await prisma.resident.upsert({
      where: { userId: residentUser.id },
      update: { apartmentId: apartment.id },
      create: {
        userId: residentUser.id,
        complexId: complex.id,
        apartmentId: apartment.id,
        identificationType: 'CC',
        identificationNumber: `${10203040 + index * 10 + position}`,
        emergencyContact: 'Ana Familiar 3000000000',
      },
    });
    residents.push(resident);
  }
  const vehicle = await prisma.vehicle.upsert({
    where: { complexId_plate: { complexId: complex.id, plate: `ABC${index}23` } },
    update: { status: 'ACTIVE' },
    create: {
      complexId: complex.id,
      residentId: residents[0].id,
      plate: `ABC${index}23`,
      type: 'CAR',
      brand: 'Renault',
      model: '2023',
      color: 'Gris',
    },
  });
  const spaces = await Promise.all(
    [
      ['F-01', 'FIXED'],
      ['C-01', 'COMMUNAL'],
      ['D-01', 'DRAW'],
      ['V-01', 'VISITOR'],
      ['T-01', 'TEMPORARY'],
    ].map(([number, type]) =>
      prisma.parkingSpace.upsert({
        where: { complexId_number: { complexId: complex!.id, number } },
        update: {},
        create: {
          complexId: complex!.id,
          number,
          type: type as 'FIXED' | 'COMMUNAL' | 'DRAW' | 'VISITOR' | 'TEMPORARY',
        },
      }),
    ),
  );
  if (
    !(await prisma.parkingAssignment.findFirst({
      where: { complexId: complex.id, parkingSpaceId: spaces[0].id, status: 'ACTIVE' },
    }))
  ) {
    await prisma.parkingAssignment.create({
      data: {
        complexId: complex.id,
        parkingSpaceId: spaces[0].id,
        apartmentId: apartments[0].id,
        residentId: residents[0].id,
        vehicleId: vehicle.id,
        type: 'FIXED',
        startDate: new Date('2026-01-01'),
        status: 'ACTIVE',
        createdById: admin.id,
      },
    });
    await prisma.parkingSpace.update({
      where: { id: spaces[0].id },
      data: { status: 'ASSIGNED' },
    });
  }
  if (!(await prisma.reservation.findFirst({ where: { complexId: complex.id } })))
    await prisma.reservation.create({
      data: {
        complexId: complex.id,
        parkingSpaceId: spaces[1].id,
        residentId: residents[1].id,
        startDateTime: new Date('2026-12-01T08:00:00Z'),
        endDateTime: new Date('2026-12-01T12:00:00Z'),
        status: 'CONFIRMED',
      },
    });
  let visitor = await prisma.visitor.findFirst({
    where: { complexId: complex.id, identificationNumber: `900${index}001` },
  });
  if (!visitor)
    visitor = await prisma.visitor.create({
      data: {
        complexId: complex.id,
        fullName: 'Julián Visitante',
        identificationNumber: `900${index}001`,
        phone: '3155550000',
      },
    });
  if (
    !(await prisma.visitorAuthorization.findFirst({
      where: { complexId: complex.id, visitorId: visitor.id },
    }))
  )
    await prisma.visitorAuthorization.create({
      data: {
        complexId: complex.id,
        visitorId: visitor.id,
        residentId: residents[0].id,
        apartmentId: apartments[0].id,
        plate: `VIS${index}11`,
        validFrom: new Date('2026-09-01'),
        validUntil: new Date('2026-12-31'),
        authorizationCode: `PK-SEED-${index}`,
      },
    });
  if (!(await prisma.fine.findFirst({ where: { complexId: complex.id } })))
    await prisma.fine.create({
      data: {
        complexId: complex.id,
        residentId: residents[1].id,
        apartmentId: apartments[1].id,
        reason: 'Uso indebido de zona común',
        amount: 85000,
        dueDate: new Date('2026-10-15'),
        createdById: admin.id,
      },
    });
  let charge = await prisma.charge.findFirst({
    where: {
      complexId: complex.id,
      residentId: residents[0].id,
      concept: 'Administración septiembre 2026',
    },
  });
  if (!charge)
    charge = await prisma.charge.create({
      data: {
        complexId: complex.id,
        residentId: residents[0].id,
        concept: 'Administración septiembre 2026',
        amount: 450000,
        dueDate: new Date('2026-09-10'),
        status: 'PAID',
      },
    });
  if (!(await prisma.payment.findFirst({ where: { chargeId: charge.id } })))
    await prisma.payment.create({
      data: {
        chargeId: charge.id,
        residentId: residents[0].id,
        amount: 450000,
        paymentDate: new Date('2026-09-05'),
        method: 'SIMULATED_TRANSFER',
        status: 'CONFIRMED',
        reference: `SEED-PAY-${index}`,
      },
    });
  if (
    !(await prisma.notification.findFirst({
      where: { userId: residents[0].userId, title: 'Bienvenido a Parkly' },
    }))
  )
    await prisma.notification.create({
      data: {
        userId: residents[0].userId,
        complexId: complex.id,
        title: 'Bienvenido a Parkly',
        message: 'Tu cuenta de residente está lista para usar.',
        type: 'SYSTEM',
      },
    });
  if (
    !(await prisma.auditLog.findFirst({
      where: { complexId: complex.id, action: 'Seed data created' },
    }))
  )
    await prisma.auditLog.create({
      data: {
        complexId: complex.id,
        userId: security.id,
        action: 'Seed data created',
        entity: 'Complex',
        entityId: complex.id,
        newValue: { source: 'prisma seed' },
      },
    });
}

async function main(): Promise<void> {
  const superadmin = await user('superadmin@parkly.test', {
    firstName: 'Sofía',
    lastName: 'Parkly',
    role: Role.SUPERADMIN,
  });
  const basic = await prisma.plan.upsert({
    where: { name: 'BASIC' },
    update: {},
    create: {
      name: 'BASIC',
      monthlyPrice: 199000,
      maxApartments: 50,
      maxParkingSpaces: 70,
      maxSecurityUsers: 3,
      features: { reservations: true, reports: false },
    },
  });
  await prisma.plan.upsert({
    where: { name: 'PROFESSIONAL' },
    update: {},
    create: {
      name: 'PROFESSIONAL',
      monthlyPrice: 399000,
      maxApartments: 250,
      maxParkingSpaces: 350,
      maxSecurityUsers: 10,
      features: { reservations: true, reports: true, draws: true },
    },
  });
  await prisma.plan.upsert({
    where: { name: 'ENTERPRISE' },
    update: {},
    create: {
      name: 'ENTERPRISE',
      monthlyPrice: 799000,
      maxApartments: 1000,
      maxParkingSpaces: 1500,
      maxSecurityUsers: 50,
      features: { reservations: true, reports: true, draws: true, customBranding: true },
    },
  });
  await seedComplex(1, basic.id);
  await seedComplex(2, basic.id);
  console.log(`Seed listo. Superadmin: ${superadmin.email} / ${password}`);
  console.log(
    `Admin: admin1@parkly.test / ${password} | Seguridad: seguridad1@parkly.test / ${password} | Residente: residente11@parkly.test / ${password}`,
  );
}
main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
