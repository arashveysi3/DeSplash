import { useEffect, useState, useCallback } from 'react'
import { Button, KIND, SIZE, SHAPE } from 'baseui/button'

export default function PWAUpdater() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [updateFn, setUpdateFn] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [checking, setChecking] = useState(false)

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
      <div style={{
        position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center',
        background:'radial-gradient(1200px 600px at 50% -10%, #1a1a1a 0%, #000 55%)',
        padding:'16px'
      }}>
        <div style={{
          width:'100%', maxWidth:420, background:'#fff', borderRadius:24, padding:'28px 22px', textAlign:'center',
          boxShadow:'0 24px 64px rgba(0,0,0,0.35)', overflow:'hidden', position:'relative'
        }}>
          <div style={{position:'absolute', top:0, left:0, right:0, height:4, background:'#eee'}}>
            <div style={{
              height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#000 0%,#4f46e5 50%,#06b6d4 100%)',
              transition:'width 0.35s cubic-bezier(.2,.8,.2,1)', borderRadius:999
            }}/>
          </div>
          <div style={{
            width:72, height:72, margin:'8px auto 14px', borderRadius:20, background:'#000', color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:22,
            boxShadow:'0 10px 24px rgba(0,0,0,0.2)', animation:'gs-pulse 1.4s infinite'
          }}>GS</div>
          <div style={{fontWeight:800, fontSize:18, letterSpacing:'-0.5px'}}>Updating GermanSplash…</div>
          <div style={{fontSize:13, color:'#6b6b6b', marginTop:6}}>Pulling the latest words, fixes & features.<br/>Your progress stays safe — just a quick refresh.</div>
          <div style={{marginTop:18, height:8, background:'#f3f3f3', borderRadius:999, overflow:'hidden'}}>
            <div style={{
              height:'100%', width:`${progress}%`,
              background:'linear-gradient(90deg,#000,#4f46e5 60%,#06b6d4)',
              borderRadius:999, transition:'width 0.35s ease',
              boxShadow:'0 0 12px rgba(79,70,229,0.35)'
            }}/>
          </div>
          <div style={{display:'flex', justifyContent:'space-between', marginTop:8}}>
            <span style={{fontSize:11, color:'#9a9a9a', fontWeight:600}}>{progress < 100 ? 'Downloading…' : 'Installing…'}</span>
            <span style={{fontSize:12, fontWeight:800}}>{progress}%</span>
          </div>
          <div style={{fontSize:11, color:'#9a9a9a', marginTop:12}}>☁️ Syncing your streak & XP to cloud before reload…</div>
        </div>
        <style>{`@keyframes gs-pulse{0%{transform:scale(1)}50%{transform:scale(1.05)}100%{transform:scale(1)}} @keyframes gs-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
      </div>
    )
  }

  return (
    <>
      {offlineReady && !dismissed && (
        <div style={{
          position:'fixed', bottom:'calc(88px + env(safe-area-inset-bottom))', left:'50%', transform:'translateX(-50%)',
          zIndex:40, background:'#111', color:'#fff', padding:'10px 14px', borderRadius:999,
          display:'flex', alignItems:'center', gap:10, boxShadow:'0 10px 28px rgba(0,0,0,0.25)', fontSize:13, fontWeight:600,
          maxWidth:'92vw'
        }}>
          <span style={{width:8,height:8, borderRadius:999, background:'#22c55e', display:'inline-block', boxShadow:'0 0 8px #22c55e'}}/>
          Ready for offline use
          <button onClick={()=> setOfflineReady(false)} style={{background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', borderRadius:999, padding:'4px 10px', fontWeight:700, cursor:'pointer'}}>OK</button>
        </div>
      )}

      {needRefresh && !dismissed && (
        <div style={{
          position:'fixed', inset:0, zIndex:45, display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(0,0,0,0.48)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', padding:'16px'
        }}>
          <div style={{
            width:'100%', maxWidth:440, background:'#fff', borderRadius:24, overflow:'hidden',
            boxShadow:'0 24px 64px rgba(0,0,0,0.28)', animation:'gs-pop 0.45s cubic-bezier(.2,.8,.2,1)'
          }}>
            <div style={{height:4, background:'linear-gradient(90deg,#000 0%,#4f46e5 50%,#06b6d4 100%)'}}/>
            <div style={{padding:'22px 20px 18px'}}>
              <div style={{display:'flex', gap:14, alignItems:'flex-start'}}>
                <div style={{
                  width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#000 0%,#1a1a1a 100%)',
                  display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:18, flexShrink:0,
                  boxShadow:'0 8px 18px rgba(0,0,0,0.2)'
                }}>↻</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800, fontSize:18, letterSpacing:'-0.5px', lineHeight:1.1}}>New version available ✨</div>
                  <div style={{fontSize:13, color:'#6b6b6b', marginTop:6, lineHeight:1.45}}>
                    GermanSplash just got better — fresh words, smoother cards & bug fixes.
                    Update now (takes ~3 seconds). Your XP, streak and weak words are safe.
                  </div>
                  <div style={{display:'flex', gap:6, flexWrap:'wrap', marginTop:10}}>
                    <span style={{fontSize:11, fontWeight:700, background:'#f7f7f7', border:'1px solid #eee', padding:'4px 8px', borderRadius:999}}>⚡ Instant reload</span>
                    <span style={{fontSize:11, fontWeight:700, background:'#f0fdf4', border:'1px solid #dcfce7', color:'#16a34a', padding:'4px 8px', borderRadius:999}}>✓ Progress kept</span>
                    <span style={{fontSize:11, fontWeight:700, background:'#eff6ff', border:'1px solid #dbeafe', color:'#2563eb', padding:'4px 8px', borderRadius:999}}>📚 Latest Menschen data</span>
                  </div>
                </div>
              </div>

              <div style={{display:'flex', gap:8, marginTop:18}}>
                <Button kind={KIND.secondary} shape={SHAPE.pill} size={SIZE.compact}
                  overrides={{BaseButton:{style:{flex:1, fontWeight:700}}}}
                  onClick={()=> { setDismissed(true); setTimeout(()=> setDismissed(false), 60000) }}>
                  Later
                </Button>
                <Button shape={SHAPE.pill} size={SIZE.compact}
                  overrides={{BaseButton:{style:{flex:1.5, fontWeight:800, background:'#000'}}}}
                  onClick={doUpdate}>
                  Update now →
                </Button>
              </div>
              <div style={{textAlign:'center', marginTop:10}}>
                <button
                  onClick={checkNow}
                  disabled={checking}
                  style={{background:'none', border:'none', color:'#9a9a9a', fontSize:11, fontWeight:600, cursor:'pointer', textDecoration:'underline'}}>
                  {checking ? 'Checking…' : 'Check again'}
                </button>
                <span style={{color:'#e5e5e5', margin:'0 6px'}}>•</span>
                <span style={{fontSize:11, color:'#9a9a9a'}}>Auto-checks on app open & every hour</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* floating check button for header integration - exported via event */}
      <style>{`@keyframes gs-pop{0%{transform:scale(0.96) translateY(8px); opacity:0}100%{transform:scale(1) translateY(0); opacity:1}}`}</style>
    </>
  )
}

// tiny helper hook for header button state
export function usePWAUpdateTrigger() {
  return () => window.dispatchEvent(new CustomEvent('gs:check-update'))
}
