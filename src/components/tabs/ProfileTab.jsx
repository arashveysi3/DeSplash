import { Block } from 'baseui/block';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { Heading } from 'baseui/heading';
import { LabelSmall, ParagraphSmall } from 'baseui/typography';
import { BOOKS } from '../../data/menschen.js';
import { getBookMastery, getLektionMastery } from '../../utils/progress.js';
import { fetchOnlineLeaderboard } from '../../db.js';
import UberCard from '../cards/UberCard.jsx';
import { User, Flame, Zap, Star, Medal, BookOpen, Target, CheckCircle2, ICON_SIZES } from '../icons.jsx';

function MetricCard({ icon: Icon, label, value, color = '#0f0f12', bg = '#f7f7fb' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ display: 'inline-flex', padding: 8, borderRadius: 12, background: bg, color }}>
        <Icon size={ICON_SIZES.card} aria-hidden="true" />
      </span>
      <div>
        <div style={{ fontSize: 11, color: '#6b6b7a', fontWeight: 700 }}>{label}</div>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{value}</div>
      </div>
    </div>
  );
}

export default function ProfileTab({ authUser, stats, selectedBookMeta, selectedLektions, scopeWords, progressMap, allWords, weakForScope, weakWords, setAuthMode, setShowAuth, handleLogout, setToast, setOnlineBoard, setUseOnline }) {
  if (!authUser) {
    return (
      <Block paddingTop="16px">
        <UberCard styleOverride={{textAlign:'center', paddingTop:'30px', paddingBottom:'30px'}}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{ display: 'inline-flex', padding: 14, borderRadius: 999, background: '#f7f7fb', border: '1px solid #e9e8f0' }}>
              <User size={ICON_SIZES.empty} aria-hidden="true" style={{ color: '#9aa0b2' }} />
            </span>
          </div>
          <Heading $style={{fontSize:18}}>Not logged in</Heading>
          <ParagraphSmall color="#6b6b6b">Sign up to save your XP, streak and weak words online. Works offline too.</ParagraphSmall>
          <Block display="flex" gridGap="8px" justifyContent="center" marginTop="12px">
            <Button shape={SHAPE.pill} onClick={()=> { setAuthMode('login'); setShowAuth(true); }}>Login</Button>
            <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> { setAuthMode('signup'); setShowAuth(true); }}>Sign up</Button>
          </Block>
        </UberCard>
      </Block>
    );
  }
  return (
    <Block paddingTop="16px">
      <UberCard styleOverride={{backgroundColor:'#000', color:'#fff', borderWidth:0, borderRadius:'20px'}}>
        <Block display="flex" justifyContent="space-between" alignItems="center">
          <Block>
            <div style={{fontSize:22, fontWeight:800}}>{authUser.username} {authUser.isAdmin && <span style={{fontSize:12, background:'#fff', color:'#000', padding:'2px 6px', borderRadius:'999px'}}>ADMIN</span>}</div>
            <div style={{fontSize:12, color:'#d4d4d4'}}>{authUser.email || 'No email'} • Joined {new Date(authUser.createdAt).toLocaleDateString()}</div>
            <div style={{fontSize:13, color:'#fff', marginTop:6, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap'}}>
              <span>{selectedBookMeta?.label} •</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Zap size={14} aria-hidden="true" /> {stats.xp} XP •</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Flame size={14} aria-hidden="true" style={{ color: '#fb923c' }} /> {stats.streak} streak •</span>
              <span>{stats.totalReviews} reviews</span>
            </div>
          </Block>
          <div style={{width:48,height:48, borderRadius:'999px', background:'#fff', color:'#000', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800}}>{authUser.username.slice(0,2).toUpperCase()}</div>
        </Block>
        <Block display="flex" gridGap="8px" marginTop="12px">
          <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={handleLogout}>Logout</Button>
          <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={async()=> { const b=await fetchOnlineLeaderboard(); if(b) setOnlineBoard(b); setUseOnline(true); setToast('Synced'); setTimeout(()=> setToast(null),1200); }}>Sync XP</Button>
        </Block>
      </UberCard>
      <Block display="flex" flexDirection="column" gridGap="8px" marginTop="12px">
        <UberCard>
          <LabelSmall>Progress — {selectedBookMeta?.label} {selectedLektions.length ? selectedLektions.join(', ') : 'Whole book'}</LabelSmall>
          {(() => { const m = getLektionMastery(scopeWords, progressMap); return (
            <>
              <Block display="flex" justifyContent="space-between" alignItems="center" marginTop="8px">
                <div style={{fontSize:22, fontWeight:800}}>{m.pct}% <span style={{fontSize:12, fontWeight:400}}>seen</span> <span style={{fontSize:14, color:'#16a34a'}}>• {m.masteredPct}% mas.</span></div>
                <div style={{fontSize:12, color:'#6b6b6b', display:'inline-flex', alignItems:'center', gap:4}}>{m.seen}/{m.total} seen • {m.mastered}<Star size={12} aria-hidden="true" style={{ color: '#eab308' }} /></div>
              </Block>
              <div style={{height:8, background:'#eee', borderRadius:999, marginTop:8, overflow:'hidden'}}>
                <div style={{height:'100%', width:`${m.pct}%`, background: '#000', borderRadius:999, transition:'width 0.5s'}} />
              </div>
              <div style={{height:6, background:'#dcfce7', borderRadius:999, marginTop:6, overflow:'hidden'}}>
                <div style={{height:'100%', width:`${m.masteredPct}%`, background: '#16a34a', borderRadius:999, transition:'width 0.5s'}} />
              </div>
              <ParagraphSmall color="#6b6b6b" marginTop="4px">{m.masteredPct >= 80 ? 'Mastered! Try next Lektion.' : `Study to see green grow — ${80 - m.masteredPct}% mastered to unlock`}</ParagraphSmall>
            </>
          );})()}
        </UberCard>
        <Block display="flex" gridGap="8px">
          {BOOKS.map(b=> {
            const m = getBookMastery(b.id, allWords, progressMap);
            return (
              <UberCard key={b.id} styleOverride={{flex:1, paddingTop:'12px', paddingBottom:'12px', background: b.gradient, color:'#fff', borderWidth:0}}>
                <LabelSmall color="white">{b.label}</LabelSmall>
                <div style={{fontWeight:800, fontSize:18}}>{m.pct}% <span style={{fontSize:10, opacity:0.8}}>seen</span></div>
                <div style={{fontSize:11, opacity:0.9, display:'flex', alignItems:'center', gap:3}}>{m.seen}/{m.total} seen • {m.mastered}<Star size={11} aria-hidden="true" /> {m.masteredPct}% mas.</div>
              </UberCard>
            );
          })}
        </Block>
        <UberCard>
          <LabelSmall>Stats</LabelSmall>
          <Block display="flex" flexDirection="column" gridGap="10px" marginTop="10px">
            <MetricCard icon={Zap} label="Total XP" value={stats.xp} color="#eab308" bg="#fefce8" />
            <MetricCard icon={Flame} label="Day streak" value={stats.streak} color="#f97316" bg="#fff7ed" />
            <MetricCard icon={Target} label="Weak in scope" value={weakForScope.length} color="#dc2626" bg="#fef2f2" />
            <MetricCard icon={Medal} label="Mastered words" value={allWords.filter((w) => progressMap[w.id]?.interval >= 14).length} color="#16a34a" bg="#f0fdf4" />
            <MetricCard icon={BookOpen} label="Learned words" value={Object.keys(progressMap).length} color="#4f46e5" bg="#eef2ff" />
          </Block>
          <Block display="flex" justifyContent="space-between" marginTop="12px">
            <ParagraphSmall>Total weak</ParagraphSmall><ParagraphSmall>{weakWords.length}</ParagraphSmall>
          </Block>
          <Block display="flex" justifyContent="space-between">
            <ParagraphSmall>Custom cards</ParagraphSmall><ParagraphSmall>{allWords.filter(w=>w.isCustom).length}</ParagraphSmall>
          </Block>
          <Block display="flex" justifyContent="space-between">
            <ParagraphSmall>Total words</ParagraphSmall><ParagraphSmall>{allWords.length}</ParagraphSmall>
          </Block>
          <Block marginTop="8px" display="flex" alignItems="center" gridGap="6px">
            <CheckCircle2 size={14} aria-hidden="true" style={{ color: '#16a34a' }} />
            <LabelSmall color="#16a34a">Progress syncs across devices when logged in</LabelSmall>
          </Block>
        </UberCard>
      </Block>
    </Block>
  );
}
