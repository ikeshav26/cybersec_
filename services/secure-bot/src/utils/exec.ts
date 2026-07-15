/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { exec } from 'child_process'
import { promisify } from 'util'

export const asyncExec = promisify(exec)
