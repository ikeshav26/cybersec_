import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client.js'

const connectionString = `${process.env.DATABASE_URL}`
console.log('AUTH-SERVICE DATABASE_URL:', connectionString)

const adapter = new PrismaPg({ connectionString }, { schema: 'auth' })
const prisma = new PrismaClient({ adapter })

export { prisma }
