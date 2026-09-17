import { Block } from 'baseui/block';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { Input } from 'baseui/input';
import { LabelSmall, ParagraphSmall } from 'baseui/typography';
import { fetchOnlineLeaderboard, submitOnlineScore, deleteOnlineScore, resetOnlineBoard } from '../../db.js';
import UberCard from '../cards/UberCard.jsx';

export default function BoardTab({ leaderboard, stats, username, setUsername, onlineBoard, onlineError, setOnlineError, useOnline, setUseOnline, adminMode, setAdminMode, adminToken, setAdminToken, setOnlineBoard, setToast, selectedBookMeta }) {
  // fallback direct import if not in global
  // we import functions directly to avoid global hack; use props passed via App
  return (
    <Block paddingTop="16px">
      <UberCard styleOverride={{ backgroundColor: '#000', borderWidth: 0, borderRadius: '20px', paddingTop: '12px' }}>
        <Block display="flex" justifyContent="space-between" alignItems="center">
          <Block>
            <LabelSmall color="#a3a3a3" overrides={{ Block: { style: { letterSpacing: '1px', textTransform: 'uppercase' } } }}>Your rank</LabelSmall>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: '#fff' }}>#{leaderboard.rank} <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.7 }}>/ {leaderboard.all.length}</span></div>
            <div style={{ fontSize: 13, color: '#d4d4d4' }}>{selectedBookMeta?.label} • {stats.xp} XP • {stats.totalReviews} reviews • 🔥 {stats.streak} streak</div>
          </Block>
          <Block backgroundColor="white" color="black" padding="12px 16px" overrides={{ Block: { style: { borderRadius: '16px', textAlign: 'center' } } }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{stats.xp}</div>
            <div style={{ fontSize: 10, letterSpacing: '1px', fontWeight: 700 }}>TOTAL XP</div>
          </Block>
        </Block>
        <Block marginTop="12px" display="flex" justifyContent="space-between">
          <LabelSmall color="#a3a3a3">{Math.max(0, (leaderboard.all[0]?.xp || 0) - stats.xp)} XP to #1</LabelSmall>
          <LabelSmall color="#fff" overrides={{ Block: { style: { fontWeight: 700 } } }}>Season ends in 12 days</LabelSmall>
        </Block>
        <Block marginTop="12px" display="flex" gridGap="8px">
          <Input value={username} onChange={(e)=> { setUsername(e.target.value); localStorage.setItem('gs_username', e.target.value); }} placeholder="Your name" size="compact" overrides={{ Root:{style:{backgroundColor:'#1a1a1a', borderColor:'#333', borderRadius:'999px' }}, Input:{style:{color:'#fff'}}}} />
          <Button size={SIZE.compact} kind={KIND.secondary} shape={SHAPE.pill} onClick={async()=> {
            if(!username.trim()) { setOnlineError('Enter a name first'); setTimeout(()=> setOnlineError(null),1500); return; }
            const b = await submitOnlineScore(username.trim(), stats.xp);
            if (b) { setOnlineBoard(b); setUseOnline(true); setToast('Score synced online ✓'); } else { setOnlineError('Online not configured'); }
            setTimeout(()=> setToast(null),1500); setTimeout(()=> setOnlineError(null),2500);
          }}>Sync</Button>
        </Block>
        {onlineError && <ParagraphSmall color="#fca5a5" marginTop="8px">{onlineError}</ParagraphSmall>}
        <Block display="flex" gridGap="8px" marginTop="8px">
          <Button size={SIZE.mini} kind={useOnline?KIND.primary:KIND.secondary} shape={SHAPE.pill} onClick={()=> setUseOnline(false)}>Local</Button>
          <Button size={SIZE.mini} kind={useOnline?KIND.secondary:KIND.primary} shape={SHAPE.pill} onClick={async()=> { const b=await fetchOnlineLeaderboard(); if(b){ setOnlineBoard(b); setUseOnline(true);} else setOnlineError('Online not available'); setTimeout(()=> setOnlineError(null),3000); }}>{onlineBoard ? 'Online ✓' : 'Online'}</Button>
          <LabelSmall color="#6b6b6b" overrides={{Block:{style:{alignSelf:'center'}}}}>{useOnline ? 'Synced board' : 'Local mock board'}</LabelSmall>
        </Block>
      </UberCard>

      <Block display="flex" flexDirection="column" gridGap="8px" marginTop="12px">
        {leaderboard.all.map((p, i) => (
          <UberCard key={p.name} styleOverride={{ borderColor: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '#000' : '#eee', backgroundColor: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '#f7f7f7' : '#fff', borderWidth: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '2px' : '1px' }}>
            <Block display="flex" justifyContent="space-between" alignItems="center">
              <Block display="flex" alignItems="center" gridGap="12px">
                <div style={{ width: 32, height: 32, borderRadius: '999px', background: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '#000' : '#eee', color: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '#fff' : '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11 }}>#{i + 1}</div>
                <div style={{ width: 36, height: 36, borderRadius: '999px', background: '#fff', border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{p.avatar}</div>
                <Block>
                  <div style={{ fontWeight: p.name.toLowerCase()=== (username||'You').toLowerCase() ? 800 : 600, fontSize: 14 }}>{p.name} {p.name.toLowerCase()=== (username||'You').toLowerCase() && '• You'}</div>
                  <div style={{ fontSize: 11, color: '#6b6b6b' }}>{p.xp} XP</div>
                </Block>
              </Block>
              <Block display="flex" alignItems="center" gridGap="8px">
                {i < 3 && <span style={{ fontSize: 18 }}>{['🥇', '🥈', '🥉'][i]}</span>}
                {adminMode && <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.circle} onClick={async()=> { const b = await deleteOnlineScore(p.name, adminToken); if(b){ setOnlineBoard(b); setToast(`Deleted ${p.name}`); } else setOnlineError('Delete failed'); setTimeout(()=> setToast(null),1500); setTimeout(()=> setOnlineError(null),2000); }}>×</Button>}
              </Block>
            </Block>
          </UberCard>
        ))}
      </Block>
      <Block display="flex" justifyContent="space-between" alignItems="center" marginTop="12px">
        <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setAdminMode(!adminMode)}>{adminMode ? 'Exit admin' : 'Admin'}</Button>
        {adminMode && <LabelSmall color="#dc2626">Admin: tap × to delete</LabelSmall>}
      </Block>
      {adminMode && (
        <UberCard styleOverride={{marginTop:'8px', backgroundColor:'#fef2f2', borderColor:'#fecaca'}}>
          <LabelSmall>Admin</LabelSmall>
          <Input value={adminToken} onChange={e=> { setAdminToken(e.target.value); localStorage.setItem('gs_admin_token', e.target.value); }} placeholder="Admin token" size="compact" overrides={{Root:{style:{marginTop:'8px', borderRadius:'12px'}}}} />
          <Block display="flex" gridGap="8px" marginTop="8px">
            <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={async()=> { const b = await resetOnlineBoard(adminToken); if(b){ setOnlineBoard(b); setUseOnline(true); setToast('Board reset'); } else setOnlineError('Reset failed'); setTimeout(()=> setOnlineError(null),2000); setTimeout(()=> setToast(null),1500); }}>Reset</Button>
            <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={async()=> { const b = await fetchOnlineLeaderboard(); if(b) setOnlineBoard(b); setUseOnline(true); }}>Refresh</Button>
          </Block>
        </UberCard>
      )}
    </Block>
  );
}
