import { Block } from 'baseui/block';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { Heading } from 'baseui/heading';
import { LabelSmall, ParagraphSmall } from 'baseui/typography';
import { BOOKS } from '../../data/menschen.js';
import { getBookMastery, getLektionMastery } from '../../utils/progress.js';
import { fetchOnlineLeaderboard } from '../../db.js';
import UberCard from '../cards/UberCard.jsx';

export default function ProfileTab({ authUser, stats, selectedBookMeta, selectedLektions, scopeWords, progressMap, allWords, weakForScope, weakWords, setAuthMode, setShowAuth, handleLogout, setToast, setOnlineBoard, setUseOnline }) {
  if (!authUser) {
    return (
      <Block paddingTop="16px">
        <UberCard styleOverride={{textAlign:'center', paddingTop:'30px', paddingBottom:'30px'}}>
          <div style={{fontSize:40}}>👤</div>
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
            <div style={{fontSize:13, color:'#fff', marginTop:6}}>{selectedBookMeta?.label} • {stats.xp} XP • 🔥 {stats.streak} streak • {stats.totalReviews} reviews</div>
          </Block>
          <div style={{width:48,height:48, borderRadius:'999px', background:'#fff', color:'#000', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800}}>{authUser.username.slice(0,2).toUpperCase()}</div>
        </Block>
        <Block display="flex" gridGap="8px" marginTop="12px">
          <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={handleLogout}>Logout</Button>
          <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={async()=> { const b=await fetchOnlineLeaderboard(); if(b) setOnlineBoard(b); setUseOnline(true); setToast('Synced ✓'); setTimeout(()=> setToast(null),1200); }}>Sync XP</Button>
        </Block>
      </UberCard>
      <Block display="flex" flexDirection="column" gridGap="8px" marginTop="12px">
        <UberCard>
          <LabelSmall>Progress — {selectedBookMeta?.label} {selectedLektions.length ? selectedLektions.join(', ') : 'Whole book'}</LabelSmall>
          {(() => { const m = getLektionMastery(scopeWords, progressMap); return (
            <>
              <Block display="flex" justifyContent="space-between" alignItems="center" marginTop="8px">
                <div style={{fontSize:22, fontWeight:800}}>{m.pct}% <span style={{fontSize:12, fontWeight:400}}>seen</span> <span style={{fontSize:14, color:'#16a34a'}}>• {m.masteredPct}% mas.</span></div>
                <div style={{fontSize:12, color:'#6b6b6b'}}>{m.seen}/{m.total} seen • {m.mastered}★</div>
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
                <div style={{fontSize:11, opacity:0.9}}>{m.seen}/{m.total} seen • {m.mastered}★ {m.masteredPct}% mas.</div>
              </UberCard>
            );
          })}
        </Block>
        <UberCard>
          <LabelSmall>Stats</LabelSmall>
          <Block display="flex" justifyContent="space-between" marginTop="8px">
            <ParagraphSmall>Weak in scope</ParagraphSmall><ParagraphSmall>{weakForScope.length}</ParagraphSmall>
          </Block>
          <Block display="flex" justifyContent="space-between">
            <ParagraphSmall>Total weak</ParagraphSmall><ParagraphSmall>{weakWords.length}</ParagraphSmall>
          </Block>
          <Block display="flex" justifyContent="space-between">
            <ParagraphSmall>Custom cards</ParagraphSmall><ParagraphSmall>{allWords.filter(w=>w.isCustom).length}</ParagraphSmall>
          </Block>
          <Block display="flex" justifyContent="space-between">
            <ParagraphSmall>Total words</ParagraphSmall><ParagraphSmall>{allWords.length}</ParagraphSmall>
          </Block>
        </UberCard>
      </Block>
    </Block>
  );
}
