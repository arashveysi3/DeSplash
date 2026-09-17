import { Block } from 'baseui/block';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { Input } from 'baseui/input';
import { Heading } from 'baseui/heading';
import { ParagraphSmall } from 'baseui/typography';

export default function AuthModal({ show, onClose, authMode, setAuthMode, authForm, setAuthForm, onLogin, onSignup }) {
  if (!show) return null;
  return (
    <Block overrides={{ Block: { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' } } }} onClick={onClose}>
      <Block onClick={(e)=> e.stopPropagation()} overrides={{ Block: { style: { background: '#fff', borderRadius: '20px', padding: '20px', width: '100%', maxWidth: '400px' } } }}>
        <Heading $style={{ fontSize: 18, marginTop: 0 }}>{authMode==='login' ? 'Login' : 'Sign up'}</Heading>
        <ParagraphSmall color="#6b6b6b">{authMode==='login' ? 'Welcome back! Your progress is saved per account.' : 'Create account — admin is username "admin".'}</ParagraphSmall>
        <Block display="flex" flexDirection="column" gridGap="10px" marginTop="12px">
          <Input value={authForm.username} onChange={e=> setAuthForm({...authForm, username: e.target.value})} placeholder="Username (a-z, 0-9, _ -)" overrides={{Root:{style:{borderRadius:'12px'}}}} />
          {authMode==='signup' && <Input value={authForm.email} onChange={e=> setAuthForm({...authForm, email: e.target.value})} placeholder="Email (optional)" overrides={{Root:{style:{borderRadius:'12px'}}}} />}
          <Input type="password" value={authForm.password} onChange={e=> setAuthForm({...authForm, password: e.target.value})} placeholder="Password (min 4)" overrides={{Root:{style:{borderRadius:'12px'}}}} />
          <Block display="flex" gridGap="8px" marginTop="8px">
            <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={onClose}>Cancel</Button>
            {authMode==='login' ? <Button shape={SHAPE.pill} onClick={onLogin}>Login</Button> : <Button shape={SHAPE.pill} onClick={onSignup}>Sign up</Button>}
          </Block>
          <Button kind={KIND.tertiary} size={SIZE.mini} onClick={()=> setAuthMode(authMode==='login' ? 'signup' : 'login')}>{authMode==='login' ? 'Need account? Sign up' : 'Have account? Login'}</Button>
        </Block>
      </Block>
    </Block>
  );
}
