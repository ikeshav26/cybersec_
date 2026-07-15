/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

interface PaginationProps {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}

const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.01] px-6 py-4">
      <div className="text-xs text-neutral-400">
        Showing <span className="font-semibold text-white">{Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
        <span className="font-semibold text-white">{Math.min(totalItems, currentPage * itemsPerPage)}</span> of{' '}
        <span className="font-semibold text-white">{totalItems}</span> entries
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-xs font-bold text-neutral-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          Previous
        </button>
        <div className="text-xs text-neutral-400 font-medium px-2">
          Page <span className="text-white font-bold">{currentPage}</span> of <span className="text-white font-bold">{totalPages}</span>
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-xs font-bold text-neutral-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default Pagination
