/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client.js'

const connectionString = `${process.env.DATABASE_URL}`
console.log('Secure-Bot DATABASE_URL:', connectionString)

const adapter = new PrismaPg({ connectionString }, { schema: 'bot' })
const prisma = new PrismaClient({ adapter })

export { prisma }
