import { Block } from 'baseui/block';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { BOOKS } from '../../data/menschen.js';

export default function Header({ stats, authUser, onAdd, onLogin, onLogout, setShowAuth, setAuthMode }) {
  const totalWords = BOOKS[0].total + BOOKS[1].total;
  return (
    <Block
      overrides={{
        Block: {
          style: {
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderBottomWidth: '1px',
            borderBottomStyle: 'solid',
            borderBottomColor: '#e9e8f0',
            paddingTop: 'calc(12px + env(safe-area-inset-top))',
            paddingBottom: '12px',
            paddingLeft: '16px',
            paddingRight: '16px',
            boxShadow: '0 4px 20px rgba(15,15,18,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'nowrap',
            minWidth: 0,
            overflow: 'hidden',
          },
          props: { className: 'gs-header' },
        },
      }}
    >
      <Block
        overrides={{
          Block: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flex: '1 1 auto',
              minWidth: 0,
              overflow: 'hidden',
            },
            props: { className: 'gs-header-left' },
          },
        }}
      >
        <div className="gs-header-logo" style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#0f0f12 0%,#4f46e5 55%,#06b6d4 100%)', color: '#fff', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 15, boxShadow: '0 6px 16px rgba(79,70,229,0.28)', letterSpacing: '-0.5px', flexShrink: 0 }}>GS</div>
        <Block overrides={{ Block: { style: { minWidth: 0, overflow: 'hidden' }, props: { className: 'gs-header-text' } } }}>
          <div className="gs-header-title" style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.7px', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>GermanSplash</span>
            <span className="gs-header-badge" style={{ fontSize: 10, background: 'linear-gradient(135deg,#4f46e5,#06b6d4)', color: '#fff', padding: '2px 6px', borderRadius: 999, fontWeight: 800, flexShrink: 0 }}>PRO</span>
          </div>
          <div className="gs-header-subtitle" style={{ fontSize: 11, color: '#6b6b7a', letterSpacing: '0.2px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>MENSCHEN A1.1 + A1.2 • {totalWords} • DE ↔ EN+FA</div>
        </Block>
      </Block>
      <Block
        overrides={{
          Block: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
              maxWidth: '62%',
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              flexWrap: 'nowrap',
            },
            props: { className: 'gs-header-actions' },
          },
        }}
      >
        <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} overrides={{ BaseButton: { style: { fontWeight: 700, flexShrink: 0 }, props: { className: 'gs-header-btn' } } }} onClick={() => window.dispatchEvent(new CustomEvent('gs:check-update'))} title="Check for update">↻</Button>
        <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} overrides={{ BaseButton: { style: { flexShrink: 0 }, props: { className: 'gs-header-btn' } } }} onClick={onAdd}>
          <span className="gs-header-add-text">＋ Add</span>
          <span className="gs-header-add-icon" style={{ display: 'none' }}>＋</span>
        </Button>
        {authUser ? (
          <>
            <Block
              backgroundColor="#000"
              color="#fff"
              padding="6px 10px"
              overrides={{
                Block: {
                  style: {
                    borderRadius: '999px',
                    fontWeight: 700,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0,
                    maxWidth: '120px',
                    overflow: 'hidden',
                  },
                  props: { className: 'gs-header-user' },
                },
              }}
            >
              <span style={{ width: 20, height: 20, borderRadius: '999px', background: '#fff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 10, flexShrink: 0 }}>{authUser.username.slice(0, 2).toUpperCase()}</span>
              <span className="gs-header-username" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{authUser.username}{authUser.isAdmin ? ' ★' : ''}</span>
            </Block>
            <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} overrides={{ BaseButton: { style: { flexShrink: 0 }, props: { className: 'gs-header-btn' } } }} onClick={onLogout}>Logout</Button>
          </>
        ) : (
          <Button size={SIZE.mini} kind={KIND.primary} shape={SHAPE.pill} overrides={{ BaseButton: { style: { flexShrink: 0 }, props: { className: 'gs-header-btn' } } }} onClick={() => { setAuthMode('login'); setShowAuth(true); }}>Login</Button>
        )}
        <Block
          backgroundColor="#fff7ed"
          padding="6px 8px"
          overrides={{
            Block: {
              style: {
                borderRadius: '999px',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: '#ffedd5',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
              },
              props: { className: 'gs-header-stat' },
            },
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>🔥</span>
          <span style={{ fontWeight: 800, fontSize: 13 }}>{stats.streak}</span>
        </Block>
        <Block backgroundColor="#000" color="#fff" padding="6px 10px" overrides={{ Block: { style: { borderRadius: '999px', fontWeight: 700, fontSize: '12px', flexShrink: 0 }, props: { className: 'gs-header-stat gs-header-xp' } } }}>{stats.xp} XP</Block>
      </Block>
    </Block>
  );
}
