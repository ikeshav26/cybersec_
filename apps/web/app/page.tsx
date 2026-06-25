'use client'

import React, { useState, useEffect } from 'react'

interface UserProfile {
  userId: string
  username: string
  email: string
  avatar: string
  installationID?: string
}

interface Repository {
  id: string
  repo_name: string
  repo_url: string
  prReviewer: boolean
  createdAt: string
}

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [syncStatus, setSyncStatus] = useState<string>('')
  const [repos, setRepos] = useState<Repository[]>([])
  const [scanStatus, setScanStatus] = useState<
    Record<
      string,
      {
        id: string
        status: string
        error?: string
        findingsCount?: number
        findings?: any[]
      }
    >
  >({})
  const [activeRepoFindings, setActiveRepoFindings] = useState<{
    repoName: string
    findings: any[]
    scanId?: string
    error?: string
  } | null>(null)
  const [fixingFindingId, setFixingFindingId] = useState<string | null>(null)
  const [fixResults, setFixResults] = useState<
    Record<
      string,
      {
        explanation: string
        code: string
      }
    >
  >({})
  const [expandedFixIds, setExpandedFixIds] = useState<Record<string, boolean>>({})
  const [selectedFindingIds, setSelectedFindingIds] = useState<string[]>([])
  const [fixingAll, setFixingAll] = useState(false)
  const [bulkFixResults, setBulkFixResults] = useState<any[] | null>(null)
  const [openingPR, setOpeningPR] = useState(false)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const [togglingPrReviewer, setTogglingPrReviewer] = useState<Record<string, boolean>>({})

  // 1. Process URL redirects & load credentials
  useEffect(() => {
    if (typeof window === 'undefined') return

    const searchParams = new URLSearchParams(window.location.search)
    const oauthStatus = searchParams.get('oauth')
    const jwtToken = searchParams.get('token')
    const userJson = searchParams.get('user')
    const installationIdFromUrl = searchParams.get('installation_id')

    // Handle Auth redirect
    if (oauthStatus === 'success' && jwtToken && userJson) {
      const parsedUser = JSON.parse(decodeURIComponent(userJson)) as UserProfile

      localStorage.setItem('token', jwtToken)
      localStorage.setItem('user', JSON.stringify(parsedUser))

      setToken(jwtToken)
      setUser(parsedUser)

      // Clean the query parameters from URL bar
      window.history.replaceState({}, document.title, window.location.pathname)
    } else {
      // Load from localStorage if already logged in
      const storedToken = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
    }

    // Capture GitHub App setup redirect (e.g. /?installation_id=XXX)
    if (installationIdFromUrl) {
      localStorage.setItem('temp_installation_id', installationIdFromUrl)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // 2. Fetch locally stored repos if user exists
  useEffect(() => {
    if (user && token) {
      handleSync(true) // Quiet check of existing repos
    }
  }, [user, token])

  useEffect(() => {
    setSelectedFindingIds([])
    setBulkFixResults(null)
    setFixResults({})
    setExpandedFixIds({})
    setPrUrl(null)
    setOpeningPR(false)
  }, [activeRepoFindings])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('temp_installation_id')
    setUser(null)
    setToken(null)
    setRepos([])
    setSyncStatus('')
  }

  const handleSync = async (quiet = false) => {
    if (!token) return
    if (!quiet) {
      setLoading(true)
      setSyncStatus('Connecting to integration service...')
    }

    try {
      // Check if we have a new installation ID from a recent redirect
      const tempInstallationId = localStorage.getItem('temp_installation_id')
      const installationIdToUse = tempInstallationId || user?.installationID

      const response = await fetch('http://localhost:5001/api/v1/sync/repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          installationId: installationIdToUse ? String(installationIdToUse) : undefined,
        }),
      })

      const resData = await response.json()

      if (response.ok && resData.success) {
        setRepos(resData.data)
        if (!quiet) setSyncStatus('Repositories synced successfully!')

        // If we synced successfully using a temp ID, update local state
        if (tempInstallationId) {
          const updatedUser = { ...user!, installationID: tempInstallationId }
          localStorage.setItem('user', JSON.stringify(updatedUser))
          localStorage.removeItem('temp_installation_id')
          setUser(updatedUser)
        }
      } else {
        if (!quiet) setSyncStatus(`Sync failed: ${resData.message || 'Unknown error'}`)
      }
    } catch (error: any) {
      console.error(error)
      if (!quiet)
        setSyncStatus(`Sync error: ${error.message || 'Failed to reach backend'}`)
    } finally {
      if (!quiet) setLoading(false)
    }
  }

  const handleScan = async (repoId: string) => {
    if (!token) return
    setScanStatus((prev) => ({ ...prev, [repoId]: { id: '', status: 'QUEUED' } }))

    try {
      const response = await fetch(
        `http://localhost:5002/api/secure-bot/scan/repo/${repoId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const resData = await response.json()
      if (response.ok && resData.success) {
        const scan = resData.data
        setScanStatus((prev) => ({
          ...prev,
          [repoId]: { id: scan.id, status: scan.status },
        }))

        pollScanStatus(repoId, scan.id)
      } else {
        setScanStatus((prev) => ({
          ...prev,
          [repoId]: {
            id: '',
            status: 'FAILED',
            error: resData.message || 'Failed to start scan',
          },
        }))
      }
    } catch (err: any) {
      setScanStatus((prev) => ({
        ...prev,
        [repoId]: {
          id: '',
          status: 'FAILED',
          error: err.message || 'Failed to reach scanner service',
        },
      }))
    }
  }

  const pollScanStatus = (repoId: string, scanId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `http://localhost:5002/api/secure-bot/scan/status/${scanId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          },
        )
        const resData = await response.json()
        if (response.ok && resData.success) {
          const scan = resData.data
          setScanStatus((prev) => ({
            ...prev,
            [repoId]: {
              id: scanId,
              status: scan.status,
              error: scan.error || undefined,
              findingsCount: scan.findings?.length || 0,
              findings: scan.findings,
            },
          }))

          if (scan.status === 'SUCCESS' || scan.status === 'FAILED') {
            clearInterval(interval)
          }
        } else {
          clearInterval(interval)
        }
      } catch (err) {
        clearInterval(interval)
      }
    }, 2000)
  }

  const handleToggleFixResult = (findingId: string) => {
    setExpandedFixIds((prev) => ({
      ...prev,
      [findingId]: !prev[findingId],
    }))
  }

  const handleFixFinding = async (findingId: string) => {
    if (!token) return
    setFixingFindingId(findingId)
    try {
      const response = await fetch(
        `http://localhost:5002/api/secure-bot/fix/finding/${findingId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      )
      const resData = await response.json()
      if (response.ok) {
        setFixResults((prev) => ({
          ...prev,
          [findingId]: {
            explanation: resData.explanation,
            code: resData.code,
          },
        }))
        setExpandedFixIds((prev) => ({
          ...prev,
          [findingId]: true,
        }))
        // Update status of this finding in the list
        if (activeRepoFindings) {
          const updatedFindings = activeRepoFindings.findings.map((f: any) =>
            f.id === findingId ? { ...f, status: 'RESOLVED' } : f,
          )
          setActiveRepoFindings({
            ...activeRepoFindings,
            findings: updatedFindings,
          })
        }
      } else {
        alert(resData.message || 'Failed to apply fix')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to connect to backend')
    } finally {
      setFixingFindingId(null)
    }
  }

  const handleFixSelected = async () => {
    if (!token || selectedFindingIds.length === 0) return
    setFixingAll(true)
    setBulkFixResults(null)
    try {
      const response = await fetch(`http://localhost:5002/api/secure-bot/fix/findings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          findingIds: selectedFindingIds,
        }),
      })
      const resData = await response.json()
      if (response.ok) {
        setBulkFixResults(resData.results || [])
        // Update status of all fixed findings in the list
        if (activeRepoFindings) {
          const updatedFindings = activeRepoFindings.findings.map((f: any) =>
            selectedFindingIds.includes(f.id) ? { ...f, status: 'RESOLVED' } : f,
          )
          setActiveRepoFindings({
            ...activeRepoFindings,
            findings: updatedFindings,
          })

          // Save the results into fixResults for each individual finding card!
          const newFixResults = { ...fixResults }
          const newExpandedFixIds = { ...expandedFixIds }

          if (resData.results && Array.isArray(resData.results)) {
            const sanitizePath = (p: string) => p.replace(/^\/?(repo|src)\//, '')

            resData.results.forEach((res: any) => {
              const resSanitized = sanitizePath(res.filePath)

              activeRepoFindings.findings.forEach((f: any) => {
                if (selectedFindingIds.includes(f.id)) {
                  const fSanitized = sanitizePath(f.filePath)
                  if (fSanitized === resSanitized) {
                    newFixResults[f.id] = {
                      explanation: res.explanation,
                      code: res.fixedCode,
                    }
                    newExpandedFixIds[f.id] = true
                  }
                }
              })
            })
          }

          setFixResults(newFixResults)
          setExpandedFixIds(newExpandedFixIds)
        }
        setSelectedFindingIds([])
      } else {
        alert(resData.message || 'Failed to apply fixes')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to connect to backend')
    } finally {
      setFixingAll(false)
    }
  }

  const handleOpenPR = async () => {
    if (!token || !activeRepoFindings?.scanId) {
      alert('Missing authentication token or active scan ID.')
      return
    }
    setOpeningPR(true)
    setPrUrl(null)
    try {
      const response = await fetch(
        `http://localhost:5002/api/secure-bot/pr/open-pr/${activeRepoFindings.scanId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const resData = await response.json()
      if (response.ok && resData.pr) {
        setPrUrl(resData.pr.html_url)
        alert('Pull Request opened successfully!')
      } else {
        alert(resData.message || 'Failed to open Pull Request')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to connect to backend')
    } finally {
      setOpeningPR(false)
    }
  }

  const handleTogglePrReviewer = async (repoId: string) => {
    if (!token) return
    setTogglingPrReviewer((prev) => ({ ...prev, [repoId]: true }))
    try {
      const response = await fetch(
        `http://localhost:5001/api/v1/pr-reviewer/update-status/${repoId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      const resData = await response.json()
      if (response.ok) {
        setRepos((prev) =>
          prev.map((r) =>
            r.id === repoId ? { ...r, prReviewer: !r.prReviewer } : r
          )
        )
      } else {
        alert(resData.message || 'Failed to toggle PR reviewer status')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to connect to backend')
    } finally {
      setTogglingPrReviewer((prev) => ({ ...prev, [repoId]: false }))
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>🛡️ CyberSuite Dashboard</div>
        {user && (
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Log Out
          </button>
        )}
      </header>

      <main style={styles.main}>
        {!user ? (
          // Logged Out Hero
          <div style={styles.heroCard}>
            <h1 style={styles.heroTitle}>Secure and Monitor Your Code</h1>
            <p style={styles.heroSubtitle}>
              Connect your GitHub account, authorize the CyberSuite security scanner, and
              monitor your repositories for vulnerabilities.
            </p>
            <a href="http://localhost:5000/api/auth/github" style={styles.loginBtn}>
              Sign In with GitHub
            </a>
          </div>
        ) : (
          // Logged In Dashboard
          <div style={styles.dashboardGrid}>
            {/* User Profile Card */}
            <div style={styles.card}>
              <div style={styles.profileHeader}>
                <img src={user.avatar} alt="Avatar" style={styles.avatar} />
                <div>
                  <h2 style={styles.username}>{user.username}</h2>
                  <p style={styles.email}>{user.email}</p>
                </div>
              </div>

              <div style={styles.divider} />

              <div style={styles.infoRow}>
                <span>Status:</span>
                <span style={styles.statusActive}>Logged In</span>
              </div>

              <div style={styles.infoRow}>
                <span>GitHub App ID:</span>
                <span style={user.installationID ? styles.idText : styles.idTextWarning}>
                  {user.installationID || 'Not Installed'}
                </span>
              </div>

              <div style={styles.actionContainer}>
                {/* Button to install GitHub App */}
                {!user.installationID && (
                  <a
                    href="https://github.com/apps/cybersuite-app/installations/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.actionBtnInstall}
                  >
                    🚀 Install GitHub App
                  </a>
                )}

                {/* Button to configure GitHub App repositories */}
                {user.installationID && (
                  <a
                    href={`https://github.com/settings/installations/${user.installationID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.actionBtnConfigure}
                  >
                    ⚙️ Configure Repositories
                  </a>
                )}

                {/* Button to sync repositories */}
                <button
                  onClick={() => handleSync(false)}
                  disabled={loading}
                  style={loading ? styles.actionBtnDisabled : styles.actionBtnSync}
                >
                  {loading ? 'Syncing...' : '🔄 Sync Repositories'}
                </button>
              </div>

              {syncStatus && (
                <div
                  style={
                    syncStatus.includes('successfully')
                      ? styles.statusSuccess
                      : styles.statusInfo
                  }
                >
                  {syncStatus}
                </div>
              )}
            </div>

            {/* Repositories Card */}
            <div style={{ ...styles.card, flex: 2 }}>
              <h3 style={styles.cardTitle}>Protected Repositories ({repos.length})</h3>

              {repos.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No repositories synced yet.</p>
                  <p style={{ fontSize: '14px', opacity: 0.6 }}>
                    Install the GitHub App and click "Sync Repositories" to bring your
                    code repositories here for scanning.
                  </p>
                </div>
              ) : (
                <div style={styles.repoList}>
                  {repos.map((repo) => {
                    const scanInfo = scanStatus[repo.id]
                    return (
                      <div key={repo.id} style={styles.repoItem}>
                        <div>
                          <h4 style={styles.repoName}>{repo.repo_name}</h4>
                          <span style={styles.repoDate}>
                            Protected since:{' '}
                            {new Date(repo.createdAt).toLocaleDateString()}
                          </span>

                          {/* Real-time Scan Status Badge */}
                          {scanInfo && (
                            <div style={styles.scanStatusContainer}>
                              <span
                                style={{
                                  ...styles.scanBadge,
                                  backgroundColor:
                                    scanInfo.status === 'SUCCESS'
                                      ? '#238636'
                                      : scanInfo.status === 'FAILED'
                                        ? '#da3633'
                                        : '#1f6feb',
                                }}
                              >
                                Status: {scanInfo.status}
                              </span>
                              {scanInfo.status === 'SUCCESS' && (
                                <span style={styles.findingsCount}>
                                  ⚠️ {scanInfo.findingsCount} issues found
                                </span>
                              )}
                              {scanInfo.status === 'FAILED' && scanInfo.error && (
                                <span style={styles.errorText}>({scanInfo.error})</span>
                              )}
                            </div>
                          )}

                          {/* Auto PR Reviewer Toggle Switch */}
                          <div style={styles.prReviewerContainer}>
                            <span style={styles.prReviewerLabel}>🤖 Auto PR Reviewer:</span>
                            <label style={styles.switch}>
                              <input
                                type="checkbox"
                                checked={repo.prReviewer || false}
                                disabled={!!togglingPrReviewer[repo.id]}
                                onChange={() => handleTogglePrReviewer(repo.id)}
                                style={styles.switchInput}
                              />
                              <span
                                style={{
                                  ...styles.slider,
                                  ...(repo.prReviewer ? styles.sliderActive : {}),
                                  opacity: togglingPrReviewer[repo.id] ? 0.6 : 1,
                                }}
                              >
                                <span
                                  style={{
                                    ...styles.sliderCircle,
                                    ...(repo.prReviewer ? styles.sliderCircleActive : {}),
                                  }}
                                />
                              </span>
                            </label>
                            {togglingPrReviewer[repo.id] && (
                              <span style={{ fontSize: '11px', opacity: 0.5, color: '#8b949e' }}>Updating...</span>
                            )}
                          </div>
                        </div>

                        <div style={styles.repoActions}>
                          <button
                            onClick={() => handleScan(repo.id)}
                            disabled={
                              scanInfo?.status === 'QUEUED' ||
                              scanInfo?.status === 'IN_PROGRESS'
                            }
                            style={{
                              ...styles.scanBtn,
                              opacity:
                                scanInfo?.status === 'QUEUED' ||
                                scanInfo?.status === 'IN_PROGRESS'
                                  ? 0.6
                                  : 1,
                              cursor:
                                scanInfo?.status === 'QUEUED' ||
                                scanInfo?.status === 'IN_PROGRESS'
                                  ? 'not-allowed'
                                  : 'pointer',
                            }}
                          >
                            {scanInfo?.status === 'QUEUED' ||
                            scanInfo?.status === 'IN_PROGRESS'
                              ? 'Scanning...'
                              : '🔍 Scan Now'}
                          </button>
                          {scanInfo?.status === 'SUCCESS' && (
                            <button
                              onClick={() =>
                                setActiveRepoFindings({
                                  repoName: repo.repo_name,
                                  findings: scanInfo?.findings || [],
                                  scanId: scanInfo?.id || '',
                                })
                              }
                              style={styles.viewFindingsBtn}
                            >
                              📋 View Findings
                            </button>
                          )}
                          {scanInfo?.status === 'FAILED' && (
                            <button
                              onClick={() =>
                                setActiveRepoFindings({
                                  repoName: repo.repo_name,
                                  findings: [],
                                  error: scanInfo?.error || 'Unknown scan error',
                                })
                              }
                              style={styles.viewErrorBtn}
                            >
                              ⚠️ View Error
                            </button>
                          )}
                          <a
                            href={repo.repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.repoLink}
                          >
                            Open on GitHub ↗
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Findings Modal */}
      {activeRepoFindings && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                Security Findings: {activeRepoFindings.repoName}
              </h3>
              <button
                onClick={() => setActiveRepoFindings(null)}
                style={styles.closeModalBtn}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              {activeRepoFindings.error ? (
                <div style={styles.errorConsole}>
                  <h4 style={{ color: '#f85149', marginTop: 0 }}>Scan Failed:</h4>
                  <pre style={styles.errorPre}>{activeRepoFindings.error}</pre>
                </div>
              ) : activeRepoFindings.findings.length === 0 ? (
                <p style={{ textAlign: 'center', opacity: 0.6 }}>
                  No findings found for this scan.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Pull Request Actions Banner (Visible whenever there are fixed/resolved findings) */}
                  {activeRepoFindings.findings.some((f) => f.status === 'RESOLVED') && (
                    <div
                      style={{
                        padding: '16px',
                        backgroundColor: '#161b22',
                        border: '1px solid #30363d',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ flex: 1, marginRight: '16px' }}>
                          <h4
                            style={{
                              margin: 0,
                              color: '#56d364',
                              fontSize: '15px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            🛡️ Security Fixes Ready
                          </h4>
                          <p
                            style={{
                              margin: '4px 0 0 0',
                              fontSize: '13px',
                              color: '#c9d1d9',
                            }}
                          >
                            Vulnerabilities have been successfully resolved by secure-bot.
                            Click below to open a Pull Request on GitHub to review and
                            merge the fixes.
                          </p>
                        </div>
                        <div>
                          {prUrl ? (
                            <a
                              href={prUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '8px 16px',
                                backgroundColor: '#238636',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              🎉 View Pull Request ↗
                            </a>
                          ) : (
                            <button
                              onClick={handleOpenPR}
                              disabled={openingPR}
                              style={{
                                padding: '8px 16px',
                                backgroundColor: '#1f6feb',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                opacity: openingPR ? 0.6 : 1,
                              }}
                            >
                              {openingPR ? 'Opening PR...' : '🚀 Open Pull Request'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bulk Fix Results Code Review Panel */}
                  {bulkFixResults && (
                    <div
                      style={{
                        padding: '16px',
                        backgroundColor: '#161b22',
                        border: '1px solid #2ea44f',
                        borderRadius: '8px',
                        marginBottom: '16px',
                      }}
                    >
                      <h4
                        style={{
                          margin: '0 0 12px 0',
                          color: '#56d364',
                          fontSize: '15px',
                        }}
                      >
                        ✓ Bulk Fixes Generated by Secure-Bot
                      </h4>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          maxHeight: '350px',
                          overflowY: 'auto',
                        }}
                      >
                        {bulkFixResults.map((res: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              borderBottom:
                                idx < bulkFixResults.length - 1
                                  ? '1px solid #21262d'
                                  : 'none',
                              paddingBottom: '12px',
                            }}
                          >
                            <strong style={{ color: '#58a6ff', fontSize: '13px' }}>
                              File: {res.filePath}
                            </strong>
                            <p
                              style={{
                                margin: '4px 0 8px 0',
                                fontSize: '12px',
                                color: '#8b949e',
                              }}
                            >
                              {res.explanation}
                            </p>
                            <pre
                              style={{
                                ...styles.codePreBlock,
                                maxHeight: '150px',
                                overflowY: 'auto',
                              }}
                            >
                              <code>{res.fixedCode}</code>
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bulk actions section */}
                  {activeRepoFindings.findings.some((f) => f.status !== 'RESOLVED') && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        backgroundColor: '#0d1117',
                        border: '1px solid #30363d',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={
                            activeRepoFindings.findings.filter(
                              (f) => f.status !== 'RESOLVED',
                            ).length > 0 &&
                            activeRepoFindings.findings
                              .filter((f) => f.status !== 'RESOLVED')
                              .every((f) => selectedFindingIds.includes(f.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const unresolvedIds = activeRepoFindings.findings
                                .filter((f) => f.status !== 'RESOLVED')
                                .map((f) => f.id)
                              setSelectedFindingIds(unresolvedIds)
                            } else {
                              setSelectedFindingIds([])
                            }
                          }}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span
                          style={{
                            fontSize: '14px',
                            color: '#c9d1d9',
                            fontWeight: 'bold',
                          }}
                        >
                          Select All Unresolved
                        </span>
                      </div>

                      {selectedFindingIds.length > 0 && (
                        <button
                          onClick={handleFixSelected}
                          disabled={fixingAll}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#238636',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                          }}
                        >
                          {fixingAll
                            ? 'Fixing Selected...'
                            : `Fix Selected (${selectedFindingIds.length})`}
                        </button>
                      )}
                    </div>
                  )}

                  <div style={styles.findingsList}>
                    {activeRepoFindings.findings.map((finding: any) => (
                      <div key={finding.id} style={styles.findingItem}>
                        <div style={styles.findingHeader}>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                          >
                            {finding.status !== 'RESOLVED' && (
                              <input
                                type="checkbox"
                                checked={selectedFindingIds.includes(finding.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFindingIds((prev) => [...prev, finding.id])
                                  } else {
                                    setSelectedFindingIds((prev) =>
                                      prev.filter((id) => id !== finding.id),
                                    )
                                  }
                                }}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  cursor: 'pointer',
                                }}
                              />
                            )}
                            <span style={styles.findingTitle}>{finding.title}</span>
                          </div>
                          <span
                            style={{
                              ...styles.severityBadge,
                              backgroundColor:
                                finding.severity === 'CRITICAL'
                                  ? '#da3633'
                                  : finding.severity === 'HIGH'
                                    ? '#ff9000'
                                    : finding.severity === 'MEDIUM'
                                      ? '#e3b341'
                                      : '#388bfd',
                            }}
                          >
                            {finding.severity}
                          </span>
                        </div>
                        <div style={styles.findingMeta}>
                          <strong>Tool:</strong> {finding.tool} |{' '}
                          <strong>Location:</strong> {finding.filePath}
                          {finding.line ? `:${finding.line}` : ''}
                        </div>
                        <p
                          style={
                            finding.status === 'RESOLVED'
                              ? styles.findingDescResolved
                              : styles.findingDesc
                          }
                        >
                          {finding.description}
                        </p>

                        <div
                          style={{
                            marginTop: '12px',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center',
                          }}
                        >
                          {finding.status !== 'RESOLVED' ? (
                            <button
                              onClick={() => handleFixFinding(finding.id)}
                              disabled={fixingFindingId === finding.id}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#238636',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                              }}
                            >
                              {fixingFindingId === finding.id ? 'Fixing...' : 'Auto Fix'}
                            </button>
                          ) : (
                            <>
                              <span
                                style={{
                                  fontSize: '13px',
                                  color: '#56d364',
                                  fontWeight: 'bold',
                                  marginRight: '5px',
                                }}
                              >
                                ✓ Fixed
                              </span>
                              <button
                                onClick={() => {
                                  if (fixResults[finding.id]) {
                                    handleToggleFixResult(finding.id)
                                  } else {
                                    handleFixFinding(finding.id)
                                  }
                                }}
                                disabled={fixingFindingId === finding.id}
                                style={{
                                  padding: '5px 10px',
                                  backgroundColor: 'transparent',
                                  color: '#58a6ff',
                                  border: '1px solid #30363d',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                }}
                              >
                                {fixingFindingId === finding.id
                                  ? 'Fetching...'
                                  : expandedFixIds[finding.id]
                                    ? 'Hide Fix Details'
                                    : 'View Fix Details'}
                              </button>
                            </>
                          )}
                        </div>

                        {fixResults[finding.id] && expandedFixIds[finding.id] && (
                          <div style={styles.fixResultContainer}>
                            <div style={styles.fixResultHeader}>
                              <span style={styles.fixResultTitle}>
                                💡 Suggested Security Fix
                              </span>
                              <button
                                onClick={() => handleToggleFixResult(finding.id)}
                                style={styles.closeFixBtn}
                                title="Close fix panel"
                              >
                                ✕
                              </button>
                            </div>

                            <div style={styles.fixResultExplanation}>
                              <h5 style={styles.fixSectionSubTitle}>Explanation</h5>
                              <p style={styles.fixExplanationText}>
                                {fixResults[finding.id]!.explanation}
                              </p>
                            </div>

                            <div style={styles.fixResultCodeContainer}>
                              <div style={styles.codeHeaderRow}>
                                <h5 style={styles.fixSectionSubTitle}>Fixed Code</h5>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      fixResults[finding.id]!.code,
                                    )
                                    alert('Fixed code copied to clipboard!')
                                  }}
                                  style={styles.copyCodeBtn}
                                >
                                  📋 Copy Code
                                </button>
                              </div>
                              <pre style={styles.codePreBlock}>
                                <code>{fixResults[finding.id]?.code}</code>
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0d1117',
    color: '#c9d1d9',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: '#161b22',
    borderBottom: '1px solid #30363d',
  },
  logo: {
    fontSize: '20px',
    fontWeight: 'bold',
    background: 'linear-gradient(45deg, #7928CA, #FF0080)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#f85149',
    border: '1px solid #f85149',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background 0.2s',
  },
  main: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
  },
  heroCard: {
    maxWidth: '600px',
    textAlign: 'center',
    padding: '60px 40px',
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  },
  heroTitle: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#ffffff',
  },
  heroSubtitle: {
    fontSize: '18px',
    opacity: 0.8,
    lineHeight: '1.6',
    marginBottom: '40px',
  },
  loginBtn: {
    display: 'inline-block',
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #58a6ff, #0056b3)',
    color: '#ffffff',
    textDecoration: 'none',
    fontWeight: 'bold',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(88, 166, 255, 0.3)',
    transition: 'transform 0.2s',
  },
  dashboardGrid: {
    display: 'flex',
    gap: '30px',
    width: '100%',
    maxWidth: '1200px',
    alignItems: 'flex-start',
  },
  card: {
    flex: 1,
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '25px',
    color: '#ffffff',
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  avatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: '2px solid #30363d',
  },
  username: {
    margin: 0,
    fontSize: '22px',
    color: '#ffffff',
  },
  email: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    opacity: 0.6,
  },
  divider: {
    height: '1px',
    backgroundColor: '#30363d',
    margin: '25px 0',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '15px',
    fontSize: '15px',
  },
  statusActive: {
    color: '#56d364',
    fontWeight: 'bold',
  },
  idText: {
    fontFamily: 'monospace',
    color: '#58a6ff',
    fontWeight: 'bold',
  },
  idTextWarning: {
    color: '#da3633',
    fontWeight: 'bold',
  },
  actionContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '30px',
  },
  actionBtnInstall: {
    display: 'block',
    textAlign: 'center',
    padding: '12px',
    backgroundColor: '#21262d',
    color: '#c9d1d9',
    textDecoration: 'none',
    border: '1px solid #30363d',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  actionBtnConfigure: {
    display: 'block',
    textAlign: 'center',
    padding: '12px',
    backgroundColor: '#21262d',
    color: '#58a6ff',
    textDecoration: 'none',
    border: '1px solid #30363d',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s, border-color 0.2s',
  },
  actionBtnSync: {
    padding: '12px',
    backgroundColor: '#238636',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  actionBtnDisabled: {
    padding: '12px',
    backgroundColor: '#21262d',
    color: '#8b949e',
    border: '1px solid #30363d',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'not-allowed',
  },
  statusInfo: {
    marginTop: '20px',
    padding: '10px 15px',
    backgroundColor: '#1f6feb22',
    border: '1px solid #1f6feb',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#58a6ff',
  },
  statusSuccess: {
    marginTop: '20px',
    padding: '10px 15px',
    backgroundColor: '#2ea44f22',
    border: '1px solid #2ea44f',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#56d364',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    border: '2px dashed #30363d',
    borderRadius: '8px',
  },
  repoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  repoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '8px',
    transition: 'transform 0.2s, background 0.2s',
  },
  repoName: {
    margin: 0,
    fontSize: '16px',
    color: '#58a6ff',
  },
  repoDate: {
    fontSize: '12px',
    opacity: 0.5,
  },
  repoLink: {
    color: '#58a6ff',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  repoActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  scanBtn: {
    padding: '8px 16px',
    backgroundColor: '#1f6feb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  scanStatusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '8px',
  },
  scanBadge: {
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  findingsCount: {
    fontSize: '12px',
    color: '#ff9000',
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: '12px',
    color: '#f85149',
  },
  viewFindingsBtn: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: '#388bfd',
    border: '1px solid #388bfd',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #30363d',
  },
  modalTitle: {
    margin: 0,
    fontSize: '18px',
    color: '#ffffff',
  },
  closeModalBtn: {
    background: 'none',
    border: 'none',
    color: '#c9d1d9',
    fontSize: '20px',
    cursor: 'pointer',
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
  },
  findingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  findingItem: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '16px',
  },
  findingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  findingTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  severityBadge: {
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  findingMeta: {
    fontSize: '13px',
    opacity: 0.6,
    marginBottom: '8px',
  },
  findingDesc: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#c9d1d9',
  },
  findingDescResolved: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#8b949e',
    textDecoration: 'line-through',
  },
  viewErrorBtn: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: '#da3633',
    border: '1px solid #da3633',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  errorConsole: {
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '16px',
  },
  errorPre: {
    margin: 0,
    padding: '12px',
    backgroundColor: '#161b22',
    border: '1px solid #21262d',
    borderRadius: '6px',
    color: '#f85149',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    fontSize: '13px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  fixResultContainer: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#161b22',
    borderRadius: '8px',
    border: '1px solid #30363d',
    borderLeft: '4px solid #2ea44f',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  fixResultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #21262d',
    paddingBottom: '8px',
  },
  fixResultTitle: {
    color: '#56d364',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  closeFixBtn: {
    background: 'none',
    border: 'none',
    color: '#8b949e',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
    transition: 'background 0.2s, color 0.2s',
  },
  fixResultExplanation: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fixSectionSubTitle: {
    margin: 0,
    fontSize: '12px',
    textTransform: 'uppercase',
    color: '#8b949e',
    letterSpacing: '0.5px',
  },
  fixExplanationText: {
    margin: 0,
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#c9d1d9',
  },
  fixResultCodeContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  codeHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  copyCodeBtn: {
    padding: '3px 8px',
    backgroundColor: '#21262d',
    color: '#c9d1d9',
    border: '1px solid #30363d',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
  },
  codePreBlock: {
    margin: 0,
    padding: '12px',
    backgroundColor: '#0d1117',
    border: '1px solid #21262d',
    borderRadius: '6px',
    overflowX: 'auto',
    fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
    fontSize: '12px',
    lineHeight: '1.4',
    color: '#c9d1d9',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  prReviewerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
  },
  prReviewerLabel: {
    fontSize: '13px',
    color: '#c9d1d9',
    userSelect: 'none',
  },
  switch: {
    position: 'relative',
    display: 'inline-block',
    width: '36px',
    height: '20px',
    cursor: 'pointer',
  },
  switchInput: {
    opacity: 0,
    width: 0,
    height: 0,
    display: 'none',
  },
  slider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#30363d',
    transition: 'background-color 0.2s',
    borderRadius: '20px',
  },
  sliderActive: {
    backgroundColor: '#238636',
  },
  sliderCircle: {
    position: 'absolute',
    content: '""',
    height: '14px',
    width: '14px',
    left: '3px',
    bottom: '3px',
    backgroundColor: '#ffffff',
    transition: 'transform 0.2s',
    borderRadius: '50%',
  },
  sliderCircleActive: {
    transform: 'translateX(16px)',
  },
}
