import { getPrisma } from "../src/prisma.js";

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

  // 3. Seed Development Requesters (>= 4 active, >= 1 inactive)
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
