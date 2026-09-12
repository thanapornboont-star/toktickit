import { getPrisma } from "../src/prisma.js";
import bcrypt from "bcryptjs";
import { Role, RequestedPriority, ITPriority, TicketStatus } from "@prisma/client";

async function main() {
  const prisma = getPrisma();

  // 1. Seed Categories (4 standard categories)
  const categories = [
    { name: "Account and Access", isActive: true },
    { name: "Hardware", isActive: true },
    { name: "Software", isActive: true },
    { name: "Network", isActive: true },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { isActive: cat.isActive },
      create: { name: cat.name, isActive: cat.isActive },
    });
  }
  console.log("Successfully seeded IT request categories.");

  // 2. Seed Related Systems (>= 6 systems)
  const relatedSystems = [
    { name: "Corporate Laptop", description: "Laptops and standard office accessories", isActive: true },
    { name: "Email", description: "Corporate mailbox & Outlook service", isActive: true },
    { name: "Campus Wi-Fi", description: "Wireless campus network connectivity", isActive: true },
    { name: "VPN", description: "Secure remote access gateway", isActive: true },
    { name: "LEB2 App", description: "Online learning platform", isActive: true },
    { name: "Grade Submission App", description: "Academic grading & evaluation system", isActive: true },
    { name: "Printer", description: "Office network printers & scanners", isActive: true },
  ];

  for (const sys of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name: sys.name },
      update: { description: sys.description, isActive: sys.isActive },
      create: { name: sys.name, description: sys.description, isActive: sys.isActive },
    });
  }
  console.log("Successfully seeded Related Systems.");

  // 3. Seed Development Requesters (Lab 2 legacy support)
  const devRequesters = [
    {
      name: "Jennifer Anderson",
      email: "jennifer.anderson@toktickit.local",
      department: "Human Resources",
      isActive: true,
    },
    {
      name: "Michael Brown",
      email: "michael.brown@toktickit.local",
      department: "Finance",
      isActive: true,
    },
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@toktickit.local",
      department: "Marketing",
      isActive: true,
    },
    {
      name: "David Lee",
      email: "david.lee@toktickit.local",
      department: "Engineering",
      isActive: true,
    },
    {
      name: "Alex Inactive",
      email: "alex.inactive@toktickit.local",
      department: "Former Staff",
      isActive: false,
    },
  ];

  for (const req of devRequesters) {
    await prisma.devRequester.upsert({
      where: { email: req.email },
      update: {
        name: req.name,
        department: req.department,
        isActive: req.isActive,
      },
      create: {
        name: req.name,
        email: req.email,
        department: req.department,
        isActive: req.isActive,
      },
    });
  }
  console.log("Successfully seeded Development Requesters.");

  // 4. Seed Users (Lab 3 Authentication & RBAC)
  const defaultUserPassword = bcrypt.hashSync("Password123!", 10);
  const staffPassword = bcrypt.hashSync("StaffPass123!", 10);
  const adminPassword = bcrypt.hashSync("AdminPass123!", 10);
  const initialPassword = bcrypt.hashSync("Initial123!", 10);

  const users = [
    // 4 Active Requesters
    {
      name: "Jennifer Anderson",
      email: "jennifer.anderson@toktickit.local",
      role: Role.REQUESTER,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultUserPassword,
    },
    {
      name: "Michael Brown",
      email: "michael.brown@toktickit.local",
      role: Role.REQUESTER,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultUserPassword,
    },
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@toktickit.local",
      role: Role.REQUESTER,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultUserPassword,
    },
    {
      name: "David Lee",
      email: "david.lee@toktickit.local",
      role: Role.REQUESTER,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultUserPassword,
    },
    // 1 Inactive Requester
    {
      name: "Alex Inactive",
      email: "alex.inactive@toktickit.local",
      role: Role.REQUESTER,
      isActive: false,
      mustChangePassword: false,
      passwordHash: defaultUserPassword,
    },
    // 1 Requester with mandatory password change
    {
      name: "New Requester",
      email: "new.user@toktickit.local",
      role: Role.REQUESTER,
      isActive: true,
      mustChangePassword: true,
      passwordHash: initialPassword,
    },
    // 3 Active IT Staff
    {
      name: "Staff Alex",
      email: "staff.alex@toktickit.local",
      role: Role.IT_STAFF,
      isActive: true,
      mustChangePassword: false,
      passwordHash: staffPassword,
    },
    {
      name: "Staff Emily",
      email: "staff.emily@toktickit.local",
      role: Role.IT_STAFF,
      isActive: true,
      mustChangePassword: false,
      passwordHash: staffPassword,
    },
    {
      name: "Staff Marcus",
      email: "staff.marcus@toktickit.local",
      role: Role.IT_STAFF,
      isActive: true,
      mustChangePassword: false,
      passwordHash: staffPassword,
    },
    // 1 Inactive IT Staff
    {
      name: "Staff Robert",
      email: "staff.robert@toktickit.local",
      role: Role.IT_STAFF,
      isActive: false,
      mustChangePassword: false,
      passwordHash: staffPassword,
    },
    // 1 Active Administrator
    {
      name: "Admin Boss",
      email: "admin.boss@toktickit.local",
      role: Role.ADMINISTRATOR,
      isActive: true,
      mustChangePassword: false,
      passwordHash: adminPassword,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
        passwordHash: u.passwordHash,
      },
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
        passwordHash: u.passwordHash,
      },
    });
  }
  console.log("Successfully seeded Lab 3 Users (Requesters, Staff, Admin).");

  // Lookup created users, categories, and systems for ticket creation
  const jennifer = await prisma.user.findUnique({ where: { email: "jennifer.anderson@toktickit.local" } });
  const michael = await prisma.user.findUnique({ where: { email: "michael.brown@toktickit.local" } });
  const sarah = await prisma.user.findUnique({ where: { email: "sarah.johnson@toktickit.local" } });
  const david = await prisma.user.findUnique({ where: { email: "david.lee@toktickit.local" } });

  const staffAlex = await prisma.user.findUnique({ where: { email: "staff.alex@toktickit.local" } });
  const staffEmily = await prisma.user.findUnique({ where: { email: "staff.emily@toktickit.local" } });
  const staffMarcus = await prisma.user.findUnique({ where: { email: "staff.marcus@toktickit.local" } });

  const catHardware = await prisma.category.findUnique({ where: { name: "Hardware" } });
  const catSoftware = await prisma.category.findUnique({ where: { name: "Software" } });
  const catNetwork = await prisma.category.findUnique({ where: { name: "Network" } });
  const catAccess = await prisma.category.findUnique({ where: { name: "Account and Access" } });

  const sysLaptop = await prisma.relatedSystem.findUnique({ where: { name: "Corporate Laptop" } });
  const sysEmail = await prisma.relatedSystem.findUnique({ where: { name: "Email" } });
  const sysVpn = await prisma.relatedSystem.findUnique({ where: { name: "VPN" } });
  const sysWifi = await prisma.relatedSystem.findUnique({ where: { name: "Campus Wi-Fi" } });
  const sysPrinter = await prisma.relatedSystem.findUnique({ where: { name: "Printer" } });

  if (
    !jennifer || !michael || !sarah || !david ||
    !staffAlex || !staffEmily || !staffMarcus ||
    !catHardware || !catSoftware || !catNetwork || !catAccess ||
    !sysLaptop || !sysEmail || !sysVpn || !sysWifi || !sysPrinter
  ) {
    throw new Error("Missing prerequisite reference data for seeding sample tickets.");
  }

  // 5. Seed Realistic Tickets Covering Statuses, Priorities & Owners
  const sampleTickets = [
    {
      ticketNumber: "TKT-2026-000101",
      summary: "Laptop battery drains rapidly during video calls",
      description: "My Dell corporate laptop battery discharges from 100% to 10% in under 45 minutes while on Teams or Zoom calls.",
      requestedPriority: RequestedPriority.MEDIUM,
      itPriority: ITPriority.MEDIUM,
      status: TicketStatus.IN_PROGRESS,
      requesterId: jennifer.id,
      ownerId: staffAlex.id,
      categoryId: catHardware.id,
      relatedSystemId: sysLaptop.id,
      requesterIndicatedResolved: false,
    },
    {
      ticketNumber: "TKT-2026-000102",
      summary: "Cannot connect to KMUTT VPN from off-campus",
      description: "Receiving error code 412: Server unreachable when authenticating via Cisco AnyConnect VPN client.",
      requestedPriority: RequestedPriority.HIGH,
      itPriority: ITPriority.HIGH,
      status: TicketStatus.OPEN,
      requesterId: michael.id,
      ownerId: staffAlex.id,
      categoryId: catNetwork.id,
      relatedSystemId: sysVpn.id,
      requesterIndicatedResolved: false,
    },
    {
      ticketNumber: "TKT-2026-000103",
      summary: "Outlook email search returns no recent emails",
      description: "Email search indexing is broken. Re-indexing was attempted but fails after 20% progress.",
      requestedPriority: RequestedPriority.LOW,
      itPriority: ITPriority.LOW,
      status: TicketStatus.NEW,
      requesterId: sarah.id,
      ownerId: null, // Unassigned
      categoryId: catSoftware.id,
      relatedSystemId: sysEmail.id,
      requesterIndicatedResolved: false,
    },
    {
      ticketNumber: "TKT-2026-000104",
      summary: "Wi-Fi connection drops in Building 3 floor 4",
      description: "Campus Wi-Fi keeps disconnecting every few minutes in the hallway of CB3 4th floor.",
      requestedPriority: RequestedPriority.MEDIUM,
      itPriority: ITPriority.HIGH,
      status: TicketStatus.WAITING_FOR_REQUESTER,
      requesterId: david.id,
      ownerId: staffEmily.id,
      categoryId: catNetwork.id,
      relatedSystemId: sysWifi.id,
      requesterIndicatedResolved: true, // Problem appears resolved
    },
    {
      ticketNumber: "TKT-2026-000105",
      summary: "Office printer jam and toner low error",
      description: "Department printer in Room 402 is jammed and displaying replace toner cartridge error.",
      requestedPriority: RequestedPriority.MEDIUM,
      itPriority: ITPriority.LOW,
      status: TicketStatus.RESOLVED,
      requesterId: jennifer.id,
      ownerId: staffMarcus.id,
      categoryId: catHardware.id,
      relatedSystemId: sysPrinter.id,
      requesterIndicatedResolved: true,
    },
    {
      ticketNumber: "TKT-2026-000106",
      summary: "Password reset assistance for department shared mailbox",
      description: "Need to update credentials for the shared marketing mailbox after staff change.",
      requestedPriority: RequestedPriority.HIGH,
      itPriority: ITPriority.MEDIUM,
      status: TicketStatus.CLOSED,
      requesterId: sarah.id,
      ownerId: staffEmily.id,
      categoryId: catAccess.id,
      relatedSystemId: sysEmail.id,
      requesterIndicatedResolved: true,
    },
    {
      ticketNumber: "TKT-2026-000107",
      summary: "VPN access requested for remote lab setup",
      description: "Need specialized VPN profile for laboratory testing cluster.",
      requestedPriority: RequestedPriority.HIGH,
      itPriority: ITPriority.HIGH,
      status: TicketStatus.REOPENED,
      requesterId: david.id,
      ownerId: staffAlex.id,
      categoryId: catNetwork.id,
      relatedSystemId: sysVpn.id,
      requesterIndicatedResolved: false,
    },
    {
      ticketNumber: "TKT-2026-000108",
      summary: "Duplicate software license request",
      description: "Accidentally submitted duplicate request for statistical package license.",
      requestedPriority: RequestedPriority.LOW,
      itPriority: ITPriority.LOW,
      status: TicketStatus.CANCELLED,
      requesterId: michael.id,
      ownerId: staffMarcus.id,
      categoryId: catSoftware.id,
      relatedSystemId: sysLaptop.id,
      requesterIndicatedResolved: false,
    },
  ];

  for (const t of sampleTickets) {
    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        status: t.status,
        requesterId: t.requesterId,
        ownerId: t.ownerId,
        categoryId: t.categoryId,
        relatedSystemId: t.relatedSystemId,
        requesterIndicatedResolved: t.requesterIndicatedResolved,
      },
      create: {
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        status: t.status,
        requesterId: t.requesterId,
        ownerId: t.ownerId,
        categoryId: t.categoryId,
        relatedSystemId: t.relatedSystemId,
        requesterIndicatedResolved: t.requesterIndicatedResolved,
      },
    });

    // Seed sample Public Comments on Ticket 101
    if (t.ticketNumber === "TKT-2026-000101") {
      const existingComments = await prisma.publicComment.findMany({ where: { ticketId: ticket.id } });
      if (existingComments.length === 0) {
        await prisma.publicComment.createMany({
          data: [
            {
              ticketId: ticket.id,
              authorId: staffAlex.id,
              content: "Hello Jennifer, we have received your battery issue report. Could you please run battery diagnostic report and attach the results?",
            },
            {
              ticketId: ticket.id,
              authorId: jennifer.id,
              content: "Thanks Alex! I will run the diagnostics right away and upload the report.",
            },
          ],
        });
      }

      // Seed sample Internal Notes on Ticket 101
      const existingNotes = await prisma.internalNote.findMany({ where: { ticketId: ticket.id } });
      if (existingNotes.length === 0) {
        await prisma.internalNote.createMany({
          data: [
            {
              ticketId: ticket.id,
              authorId: staffAlex.id,
              content: "Dell Latitude 5420 batch from Q1 2025 has known battery recall notice. Checking serial number against vendor bulletin.",
            },
            {
              ticketId: ticket.id,
              authorId: staffEmily.id,
              content: "Verified vendor bulletin. Replacement battery pack is in IT storage shelf B-3.",
            },
          ],
        });
      }
    }
  }
  console.log("Successfully seeded Sample Tickets, Public Comments, and Internal Notes.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
