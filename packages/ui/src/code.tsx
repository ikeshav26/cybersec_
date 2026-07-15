/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { type JSX } from 'react'

export function Code({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}): JSX.Element {
  return <code className={className}>{children}</code>
}
