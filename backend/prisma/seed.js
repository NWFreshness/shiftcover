import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed data can be added here later
  console.log('Database seeded')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
