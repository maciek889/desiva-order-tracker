import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding production database (reference data only)...");

  // --- Stages ---
  const stagesData = [
    { id: "s1",  name: "Konsultacja z klientem",    nameEn: "Client Consultation", position: 1,  type: "office" },
    { id: "s2",  name: "Księgowość",                nameEn: "Accounting",          position: 2,  type: "office" },
    { id: "s3",  name: "Płatność",                  nameEn: "Payment",             position: 3,  type: "office" },
    { id: "s4",  name: "Przygotowanie do produkcji",nameEn: "Pre-production",      position: 4,  type: "office" },
    { id: "s5",  name: "Przygotowanie profili",     nameEn: "Profile preparation", position: 5,  type: "factory" },
    { id: "s6",  name: "Spawanie",                  nameEn: "Welding",             position: 6,  type: "factory" },
    { id: "s7",  name: "Szlifowanie",               nameEn: "Grinding",            position: 7,  type: "factory" },
    { id: "s8",  name: "Malarnia",                  nameEn: "Painting",            position: 8,  type: "factory" },
    { id: "s9",  name: "Składanie",                 nameEn: "Assembly",            position: 9,  type: "factory" },
    { id: "s10", name: "Wysyłka",                   nameEn: "Shipping",            position: 10, type: "factory" },
  ];
  for (const s of stagesData) {
    await prisma.stage.upsert({ where: { id: s.id }, update: s, create: s });
  }
  console.log("  Stages: OK");

  // --- Categories ---
  const categoriesData = [
    { id: "c1", name: "Łazienka" },
    { id: "c2", name: "Home" },
    { id: "c3", name: "Kuchnia" },
  ];
  for (const c of categoriesData) {
    await prisma.category.upsert({ where: { id: c.id }, update: c, create: c });
  }
  console.log("  Categories: OK");

  // --- Colors ---
  const colorNames = [
    "Burgund NCS S 6030-R","Błękit pruski NCS S 7020-R80B","Zieleń butelkowa NCS S 8010-G10Y",
    "Biel NCS S 0500-N","Czerń NCS S 9000-N","Chłodny beż NCS S 4005-Y80R",
    "Gołębi NCS S 3010-R80B","Seledynowy NCS S 4010-B50G","Popielaty NCS S 3502-B",
    "Antracytowy NCS S 6502-B","Pudrowy róż NCS S 1015-Y90R","Ecru jasne NCS S 1010-G90Y",
    "Ecru ciemne NCS S 2010-Y","Błękit NCS S 2040-R80B","Lazurowy NCS S 3050-R80B",
    "Turkusowy NCS S 5020-B30G","Róż wenecki NCS S 2030-Y60R","Ceglany NCS S 3050-Y70R",
    "Rubinowy NCS S 4050-R","Jaśminowy ciemny NCS S 4005-G20Y","Jaśminowy jasny NCS S 2005-G10Y",
    "Cytrynowy NCS S 0570-G90Y","Słonecznikowy NCS S 1080-Y20R","Pomarańczowy NCS S 1080-Y60R",
    "Czerwony NCS S 1085-Y90R","Malinowy NCS S 1070-R","Różany NCS S 2040-R",
    "Liliowy NCS S 1030-R10B","Śliwkowy NCS S 5040-R20B","Fiołkowy NCS S 3040-R60B",
    "Jasny kobalt NCS S 2060-R70B","Borówkowy NCS S 6030-R60B","Chabrowy NCS S 4055-R70B",
    "Niezapominajka NCS S 2030-B50G","Awokado NCS S 3050-G","Pistacja NCS S 2030-G20Y",
    "Chłodna oliwka NCS S 5010-G50Y","Jasny beż NCS S 2502-Y","Khaki NCS S 4005-Y20R",
    "Ciemny beż NCS S 7005-Y50R","Kawowy NCS S 8005-Y80R","Piaskowy NCS S 1510-Y10R",
    "Palmowy NCS S 5020-Y10R","Oliwka NCS S 6020-G90Y","Jasna oliwka NCS S 4010-G90Y",
    "Terrakota NCS S 5020-Y60R","Miodowy NCS S 2030-Y10R","Łososiowy NCS S 2010-Y40R",
    "Kremowy NCS S 0804-Y30R","Brzoskwiniowy NCS S 1040-Y70R","Morelowy NCS S 2060-Y70R",
    "Żółty curry NCS S 2060-Y10R","Pomarańczowy siena NCS S 3060-Y40R",
    "Pudrowy róż NCS S 3010-Y80R","Burgund NCS S 5040-R","Karmelowy NCS S 3030-Y60R",
    "Kremowy jasny NCS S 0804-Y30R","Jasny beż ciepły NCS S 2502-Y50R","Chłodny szary NCS S 4500-N",
    "Oliwkowy NCS S 5010-G30Y","Chłodny błękit NCS S 3010-R90B",
  ];
  for (let i = 0; i < colorNames.length; i++) {
    const id = `col${i}`;
    await prisma.color.upsert({
      where: { id },
      update: { name: colorNames[i] },
      create: { id, name: colorNames[i] },
    });
  }
  console.log(`  Colors: OK (${colorNames.length})`);

  // --- Admin user ---
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD environment variable is required but not set.");
  }
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { login: "Admin" },
    update: { password: hashedPassword, role: "Admin", hourlyRate: 0 },
    create: { login: "Admin", password: hashedPassword, role: "Admin", hourlyRate: 0 },
  });
  console.log("  Admin user: OK");

  console.log("Production seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
