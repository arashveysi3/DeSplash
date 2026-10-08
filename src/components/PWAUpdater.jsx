import { useEffect, useState, useCallback } from 'react'
import { Sparkles, LoaderCircle } from 'lucide-react'
import BrandMark from './BrandMark.jsx'
import Icon from './shell/Icon.jsx'

export default function PWAUpdater() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [updateFn, setUpdateFn] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [changelog, setChangelog] = useState(null)
  const [changelogLoading, setChangelogLoading] = useState(false)

  // Hook into vite-plugin-pwa virtual module
  useEffect(() => {
    let intervalId = null
    let onVisibility = null
    let updateSW = null

    const init = async () => {
      try {
        const mod = await import('virtual:pwa-register')
        const registerSW = mod.registerSW
        if (!registerSW) return
        updateSW = registerSW({
          immediate: true,
          onNeedRefresh() {
            setNeedRefresh(true)
            setDismissed(false)
          },
          onOfflineReady() {
            setOfflineReady(true)
            setTimeout(() => setOfflineReady(false), 4000)
          },
          onRegisteredSW(swUrl, r) {
            // periodic check every 60s when visible, every 60min in background
            if (r) {
              intervalId = setInterval(() => {
                if (document.visibilityState === 'visible') r.update()
              }, 60 * 60 * 1000)
              onVisibility = () => {
                if (document.visibilityState === 'visible') r.update()
              }
              document.addEventListener('visibilitychange', onVisibility)
            }
          },
        })
        setUpdateFn(() => updateSW)
      } catch {
        // not in PWA context or dev
      }
    }
    init()
    return () => {
      if (intervalId) clearInterval(intervalId)
      if (onVisibility) document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Fetch changelog when an update is available â€” English commit details
  useEffect(() => {
    if (!needRefresh || changelog || changelogLoading) return
    let cancelled = false
    setChangelogLoading(true)
    fetch(`/changelog.json?v=${Date.now()}`, { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error('no changelog')
        return r.json()
      })
      .then(data => {
        if (cancelled) return
        // support both {commits:[]} and plain array
        const commits = Array.isArray(data) ? data : data.commits || data.changelog || []
        setChangelog(commits.length ? commits.slice(0, 8) : null)
      })
      .catch(() => {
        if (!cancelled) setChangelog(null)
      })
      .finally(() => {
        if (!cancelled) setChangelogLoading(false)
      })
    return () => { cancelled = true }
  }, [needRefresh, changelog, changelogLoading])

  const doUpdate = useCallback(async () => {
    if (!updateFn) {
      window.location.reload()
      return
    }
    setUpdating(true)
    setProgress(8)
    // stunning simulated progress while SW activates
    let p = 8
    const tick = setInterval(() => {
      p += Math.random() * 18 + 6
      if (p >= 92) p = 92
      setProgress(Math.round(p))
    }, 220)
    // trigger SW update + reload
    setTimeout(async () => {
      clearInterval(tick)
      setProgress(100)
      await new Promise(r => setTimeout(r, 420))
      try {
        await updateFn(true)
      } catch {
        window.location.reload()
      }
    }, 1400)
  }, [updateFn])

  const checkNow = useCallback(async () => {
    setChecking(true)
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        for (const r of regs) await r.update()
      }
      // also try fetch version via reload check: force registerSW check
      if (updateFn) {
        // no explicit check fn, rely on registration update above
      }
      // if already have update pending, show it; else toast no update
      setTimeout(() => setChecking(false), 900)
    } catch {
      setChecking(false)
    }
  }, [updateFn])

  // Manual expose for header button: dispatch custom event so other components can check
  useEffect(() => {
    const h = () => checkNow()
    window.addEventListener('gs:check-update', h)
    return () => window.removeEventListener('gs:check-update', h)
  }, [checkNow])

  if (updating) {
    return (
      <div className="pwa2-updating">
        <div className="pwa2-up-card">
          <div className="pwa2-up-top"><span style={{ width: `${progress}%` }} /></div>
          <div className="pwa2-brand"><BrandMark size={52} /></div>
          <div className="pwa2-up-title">Updating GermanSplashâ€¦</div>
          <div className="pwa2-up-desc">Pulling the latest words, fixes & features.<br/>Your progress stays safe â€” just a quick refresh.</div>
          <div className="pwa2-progress"><span style={{ width: `${progress}%` }} /></div>
          <div className="pwa2-up-meta">
            <span>{progress < 100 ? 'Downloadingâ€¦' : 'Installingâ€¦'}</span>
            <b>{progress}%</b>
          </div>
          <div className="pwa2-up-sync"><LoaderCircle size={12} aria-hidden="true" strokeWidth={1.8} className="pwa2-spin" /> Syncing your streak &amp; XP to cloud before reloadâ€¦</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {offlineReady && !dismissed && (
        <div className="pwa2-pill">
          <span className="pwa2-dot" />
          Ready for offline use
          <button type="button" className="pwa2-ok" onClick={()=> setOfflineReady(false)}>OK</button>
        </div>
      )}

      {needRefresh && !dismissed && (
        <div className="pwa2-backdrop">
          <div className="pwa2-dialog">
            <div className="pwa2-accent" />
            <div className="pwa2-body">
              <div className="pwa2-head">
                <div className="pwa2-icon"><Icon name="refresh" size={24} /></div>
                <div className="pwa2-main">
                  <div className="pwa2-title">New version available <Sparkles size={18} aria-hidden="true" strokeWidth={1.8} /></div>
                  <div className="pwa2-desc">
                    GermanSplash just got better â€” fresh words, smoother cards & bug fixes.
                    Update now (takes ~3 seconds). Your XP, streak and weak words are safe.
                  </div>
                  <div className="pwa2-chips">
                    <span className="pwa2-chip"><Icon name="bolt" size={12} /> Instant reload</span>
                    <span className="pwa2-chip ok"><Icon name="check" size={12} /> Progress kept</span>
                    <span className="pwa2-chip blue"><Icon name="book" size={12} /> Latest Menschen data</span>
                  </div>
                  {/* Changelog â€” English, from git commits */}
                  <div className="pwa2-log">
                    <div className="pwa2-log-head">
                      <span>WHAT'S NEW â€¢ CHANGELOG</span>
                      {changelogLoading && <span className="pwa2-log-load">Loadingâ€¦</span>}
                    </div>
                    <div className="pwa2-log-list">
                      {changelog && changelog.length ? changelog.map((c,i)=> (
                        <div key={c.hash || c.fullHash || i} className="pwa2-log-row">
                          <a className="pwa2-hash" href={c.url || `https://github.com/arashveysi3/DeSplash/commit/${c.hash}`} target="_blank" rel="noreferrer">{(c.hash || '').slice(0,7) || 'â€”'}</a>
                          <div className="pwa2-log-item">
                            <div className="pwa2-log-subject">{c.subject || c.message || 'Update'}</div>
                            <div className="pwa2-log-meta">{c.author || 'GermanSplash'} â€¢ {c.date || ''}</div>
                          </div>
                        </div>
                      )) : (
                        <div className="pwa2-log-empty">
                          {changelogLoading ? 'Fetching latest changesâ€¦' : 'Fresh words, smoother cards & bug fixes. Your progress stays safe.'}
                        </div>
                      )}
                    </div>
                    {changelog && changelog.length > 0 && (
                      <div className="pwa2-log-more">
                        <a href="https://github.com/arashveysi3/DeSplash/commits/main" target="_blank" rel="noreferrer">View full history on GitHub â†’</a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pwa2-actions">
                <button type="button" className="btn light small"
                  onClick={()=> { setDismissed(true); setTimeout(()=> setDismissed(false), 60000) }}>
                  Later
                </button>
                <button type="button" className="btn dark small pwa2-update" onClick={doUpdate}>
                  Update now â†’
                </button>
              </div>
              <div className="pwa2-foot">
                <button
                  type="button"
                  className="pwa2-link"
                  onClick={checkNow}
                  disabled={checking}>
                  {checking ? 'Checkingâ€¦' : 'Check again'}
                </button>
                <span className="pwa2-sep">â€¢</span>
                <span className="pwa2-note">Auto-checks on app open & every hour</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// tiny helper hook for header button state
export function usePWAUpdateTrigger() {
  return () => window.dispatchEvent(new CustomEvent('gs:check-update'))
}
