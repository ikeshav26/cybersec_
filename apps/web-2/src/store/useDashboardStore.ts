/**
 * Copyright (c) 2026 Keshav Gilhotra. All Rights Reserved.
 * This file is part of a proprietary project. Unauthorized copying is strictly prohibited.
 */

import { create } from 'zustand'

interface Finding {
  id: string
  title: string
  description: string
  filePath: string
  line?: number
  severity: string
  tool: string
  status: string
  rawDetails?: any
}

interface ScanStatus {
  id: string
  status: string
  error?: string
  findingsCount?: number
}

interface DashboardStore {
  repos: any[]
  totalRepos: number
  scans: any[]
  totalScans: number
  fixesScans: any[]
  totalFixes: number
  findings: Finding[]
  activeScanIdForFindings: string | null
  lastFetchedScanId: string | null
  repoName: string
  scanStatus: Record<string, ScanStatus>
  fixResults: Record<string, { explanation: string; code: string }>
  expandedFixIds: Record<string, boolean>
  selectedFindingIds: string[]
  openedPrUrl: string | null
  fixingFindingId: string | null
  fixingAll: boolean
  isFindingsLoading: boolean
  isPrOpening: boolean
  
  setRepos: (repos: any[] | ((prev: any[]) => any[])) => void
  setTotalRepos: (totalRepos: number) => void
  setScans: (scans: any[] | ((prev: any[]) => any[])) => void
  setTotalScans: (totalScans: number) => void
  setFixesScans: (fixesScans: any[]) => void
  setTotalFixes: (totalFixes: number) => void
  setFindings: (findings: Finding[] | ((prev: Finding[]) => Finding[])) => void
  setActiveScanIdForFindings: (activeScanIdForFindings: string | null) => void
  setLastFetchedScanId: (lastFetchedScanId: string | null) => void
  setRepoName: (repoName: string) => void
  setScanStatus: (scanStatus: Record<string, ScanStatus> | ((prev: Record<string, ScanStatus>) => Record<string, ScanStatus>)) => void
  updateSingleScanStatus: (repoId: string, status: Partial<ScanStatus>) => void
  setFixResults: (fixResults: Record<string, { explanation: string; code: string }> | ((prev: Record<string, { explanation: string; code: string }>) => Record<string, { explanation: string; code: string }>)) => void
  setExpandedFixIds: (expandedFixIds: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void
  setSelectedFindingIds: (selectedFindingIds: string[] | ((prev: string[]) => string[])) => void
  setOpenedPrUrl: (openedPrUrl: string | null) => void
  setFixingFindingId: (fixingFindingId: string | null) => void
  setFixingAll: (fixingAll: boolean) => void
  setIsFindingsLoading: (isFindingsLoading: boolean) => void
  setIsPrOpening: (isPrOpening: boolean) => void
  resetFindingsState: () => void
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  repos: [],
  totalRepos: 0,
  scans: [],
  totalScans: 0,
  fixesScans: [],
  totalFixes: 0,
  findings: [],
  activeScanIdForFindings: null,
  lastFetchedScanId: null,
  repoName: '',
  scanStatus: {},
  fixResults: {},
  expandedFixIds: {},
  selectedFindingIds: [],
  openedPrUrl: null,
  fixingFindingId: null,
  fixingAll: false,
  isFindingsLoading: false,
  isPrOpening: false,

  setRepos: (update) => set((state) => ({
    repos: typeof update === 'function' ? update(state.repos) : update
  })),
  setTotalRepos: (totalRepos) => set({ totalRepos }),
  setScans: (update) => set((state) => ({
    scans: typeof update === 'function' ? update(state.scans) : update
  })),
  setTotalScans: (totalScans) => set({ totalScans }),
  setFixesScans: (fixesScans) => set({ fixesScans }),
  setTotalFixes: (totalFixes) => set({ totalFixes }),
  
  setFindings: (update) => set((state) => ({
    findings: typeof update === 'function' ? update(state.findings) : update
  })),
  
  setActiveScanIdForFindings: (activeScanIdForFindings) => set({ activeScanIdForFindings }),
  setLastFetchedScanId: (lastFetchedScanId) => set({ lastFetchedScanId }),
  setRepoName: (repoName) => set({ repoName }),
  
  setScanStatus: (update) => set((state) => ({
    scanStatus: typeof update === 'function' ? update(state.scanStatus) : update
  })),

  updateSingleScanStatus: (repoId, status) => set((state) => {
    const current = state.scanStatus[repoId] || { id: '', status: 'QUEUED' }
    const updatedStatus = { ...current, ...status }
    
    // Also, if the scan exists in the scans list, update its status there in real-time!
    const updatedScans = state.scans.map((s) => {
      if (s.id === updatedStatus.id) {
        return {
          ...s,
          status: updatedStatus.status,
          error: updatedStatus.error || s.error,
          findings: updatedStatus.findingsCount !== undefined 
            ? Array(updatedStatus.findingsCount).fill({}) // Match length for badge counts
            : s.findings
        }
      }
      return s
    })

    return {
      scanStatus: {
        ...state.scanStatus,
        [repoId]: updatedStatus
      },
      scans: updatedScans
    }
  }),

  setFixResults: (update) => set((state) => ({
    fixResults: typeof update === 'function' ? update(state.fixResults) : update
  })),

  setExpandedFixIds: (update) => set((state) => ({
    expandedFixIds: typeof update === 'function' ? update(state.expandedFixIds) : update
  })),

  setSelectedFindingIds: (update) => set((state) => ({
    selectedFindingIds: typeof update === 'function' ? update(state.selectedFindingIds) : update
  })),

  setOpenedPrUrl: (openedPrUrl) => set({ openedPrUrl }),
  setFixingFindingId: (fixingFindingId) => set({ fixingFindingId }),
  setFixingAll: (fixingAll) => set({ fixingAll }),
  setIsFindingsLoading: (isFindingsLoading) => set({ isFindingsLoading }),
  setIsPrOpening: (isPrOpening) => set({ isPrOpening }),

  resetFindingsState: () => set({
    selectedFindingIds: [],
    fixResults: {},
    expandedFixIds: {},
    openedPrUrl: null,
    fixingFindingId: null,
    fixingAll: false,
    isFindingsLoading: false,
    isPrOpening: false,
    lastFetchedScanId: null
  })
}))
