import { Block } from 'baseui/block';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { Heading } from 'baseui/heading';
import { ParagraphSmall } from 'baseui/typography';
import { resetOnlineBoard, fetchOnlineLeaderboard } from '../../db.js';
import { deleteUser } from '../../auth.js';
import UberCard from '../cards/UberCard.jsx';

export default function AdminTab({ authUser, usersList, loadUsersList, setToast, setOnlineBoard, setUseOnline, adminToken }) {
  return (
    <Block paddingTop="16px">
      <UberCard styleOverride={{backgroundColor:'#fef2f2', borderColor:'#fecaca'}}>
        <Heading $style={{fontSize:16, margin:0}}>Admin — User management</Heading>
        <ParagraphSmall color="#991b1b">You are admin ({authUser.username}).</ParagraphSmall>
        <Block display="flex" gridGap="8px" marginTop="8px">
          <Button size={SIZE.mini} shape={SHAPE.pill} onClick={loadUsersList}>Refresh users</Button>
          <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={async()=> { const b=await resetOnlineBoard(adminToken); if(b){ setOnlineBoard(b); setUseOnline(true); setToast('Leaderboard reset'); } setTimeout(()=> setToast(null),1500); }}>Reset board</Button>
        </Block>
      </UberCard>
      <Block display="flex" flexDirection="column" gridGap="8px" marginTop="12px">
        {usersList.length===0 ? <ParagraphSmall color="#6b6b6b">No users loaded. Tap Refresh.</ParagraphSmall> :
          usersList.map(u=>(
            <UberCard key={u.username} styleOverride={{paddingTop:'12px', paddingBottom:'12px'}}>
              <Block display="flex" justifyContent="space-between" alignItems="center">
                <Block>
                  <div style={{fontWeight:700}}>{u.username} {u.isAdmin && <span style={{fontSize:10, background:'#000', color:'#fff', padding:'1px 5px', borderRadius:'999px'}}>admin</span>} <span style={{fontSize:11, color:'#6b6b6b'}}>• {u.xp} XP • {u.email || 'no email'}</span></div>
                  <div style={{fontSize:11, color:'#9a9a9a'}}>Joined {new Date(u.createdAt).toLocaleDateString()} • {u.streak||0} streak • {u.totalReviews||0} reviews</div>
                </Block>
                <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.circle} onClick={async()=> { if(!confirm(`Delete ${u.username}?`)) return; const r=await deleteUser(u.username); if(r){ const b=await fetchOnlineLeaderboard(); if(b) setOnlineBoard(b); setToast(`Deleted ${u.username}`); setTimeout(()=> setToast(null),1500); } else { setToast('Delete failed'); setTimeout(()=> setToast(null),1500); } }}>×</Button>
              </Block>
            </UberCard>
          ))
        }
      </Block>
    </Block>
  );
}
