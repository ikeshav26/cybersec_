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
  createdAt: string
}

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [syncStatus, setSyncStatus] = useState<string>('')
  const [repos, setRepos] = useState<Repository[]>([])
  const [scanStatus, setScanStatus] = useState<Record<string, { id: string, status: string, error?: string, findingsCount?: number, findings?: any[] }>>({})
  const [activeRepoFindings, setActiveRepoFindings] = useState<{ repoName: string, findings: any[] } | null>(null)

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
      const response = await fetch(`http://localhost:5002/api/secure-bot/scan/repo/${repoId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const resData = await response.json()
      if (response.ok && resData.success) {
        const scan = resData.data
        setScanStatus((prev) => ({
          ...prev,
          [repoId]: { id: scan.id, status: scan.status }
        }))

        pollScanStatus(repoId, scan.id)
      } else {
        setScanStatus((prev) => ({
          ...prev,
          [repoId]: { id: '', status: 'FAILED', error: resData.message || 'Failed to start scan' }
        }))
      }
    } catch (err: any) {
      setScanStatus((prev) => ({
        ...prev,
        [repoId]: { id: '', status: 'FAILED', error: err.message || 'Failed to reach scanner service' }
      }))
    }
  }

  const pollScanStatus = (repoId: string, scanId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:5002/api/secure-bot/scan/status/${scanId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })
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
              findings: scan.findings
            }
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
                  {repos.map((repo) => (
                    <div key={repo.id} style={styles.repoItem}>
                      <div>
                        <h4 style={styles.repoName}>{repo.repo_name}</h4>
                        <span style={styles.repoDate}>
                          Protected since: {new Date(repo.createdAt).toLocaleDateString()}
                        </span>
                        
                        {/* Real-time Scan Status Badge */}
                        {scanStatus[repo.id] && (
                          <div style={styles.scanStatusContainer}>
                            <span style={{
                              ...styles.scanBadge,
                              backgroundColor: 
                                scanStatus[repo.id].status === 'SUCCESS' ? '#238636' :
                                scanStatus[repo.id].status === 'FAILED' ? '#da3633' :
                                '#1f6feb'
                            }}>
                              Status: {scanStatus[repo.id].status}
                            </span>
                            {scanStatus[repo.id].status === 'SUCCESS' && (
                              <span style={styles.findingsCount}>
                                ⚠️ {scanStatus[repo.id].findingsCount} issues found
                              </span>
                            )}
                            {scanStatus[repo.id].status === 'FAILED' && scanStatus[repo.id].error && (
                              <span style={styles.errorText}>
                                ({scanStatus[repo.id].error})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div style={styles.repoActions}>
                        <button
                          onClick={() => handleScan(repo.id)}
                          disabled={
                            scanStatus[repo.id]?.status === 'QUEUED' || 
                            scanStatus[repo.id]?.status === 'IN_PROGRESS'
                          }
                          style={{
                            ...styles.scanBtn,
                            opacity: (scanStatus[repo.id]?.status === 'QUEUED' || scanStatus[repo.id]?.status === 'IN_PROGRESS') ? 0.6 : 1,
                            cursor: (scanStatus[repo.id]?.status === 'QUEUED' || scanStatus[repo.id]?.status === 'IN_PROGRESS') ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {scanStatus[repo.id]?.status === 'QUEUED' || scanStatus[repo.id]?.status === 'IN_PROGRESS' 
                            ? 'Scanning...' 
                            : '🔍 Scan Now'}
                        </button>
                        {scanStatus[repo.id]?.status === 'SUCCESS' && (
                          <button
                            onClick={() => setActiveRepoFindings({
                              repoName: repo.repo_name,
                              findings: scanStatus[repo.id].findings || []
                            })}
                            style={styles.viewFindingsBtn}
                          >
                            📋 View Findings
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
                  ))}
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
              <h3 style={styles.modalTitle}>Security Findings: {activeRepoFindings.repoName}</h3>
              <button 
                onClick={() => setActiveRepoFindings(null)} 
                style={styles.closeModalBtn}
              >
                ✕
              </button>
            </div>
            
            <div style={styles.modalBody}>
              {activeRepoFindings.findings.length === 0 ? (
                <p style={{ textAlign: 'center', opacity: 0.6 }}>No findings found for this scan.</p>
              ) : (
                <div style={styles.findingsList}>
                  {activeRepoFindings.findings.map((finding: any) => (
                    <div key={finding.id} style={styles.findingItem}>
                      <div style={styles.findingHeader}>
                        <span style={styles.findingTitle}>{finding.title}</span>
                        <span style={{
                          ...styles.severityBadge,
                          backgroundColor: 
                            finding.severity === 'CRITICAL' ? '#da3633' :
                            finding.severity === 'HIGH' ? '#ff9000' :
                            finding.severity === 'MEDIUM' ? '#e3b341' :
                            '#388bfd'
                        }}>
                          {finding.severity}
                        </span>
                      </div>
                      <div style={styles.findingMeta}>
                        <strong>Tool:</strong> {finding.tool} | <strong>Location:</strong> {finding.filePath}{finding.line ? `:${finding.line}` : ''}
                      </div>
                      <p style={finding.status === 'RESOLVED' ? styles.findingDescResolved : styles.findingDesc}>
                        {finding.description}
                      </p>
                    </div>
                  ))}
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
}
