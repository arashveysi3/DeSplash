import { Block } from 'baseui/block';

export default function UberCard({ children, onClick, styleOverride = {}, bodyStyle = {} }) {
  return (
    <Block
      onClick={onClick}
      overrides={{
        Block: {
          style: {
            backgroundColor: '#fff',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e9e8f0',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            borderBottomLeftRadius: '20px',
            borderBottomRightRadius: '20px',
            paddingTop: '16px',
            paddingBottom: '16px',
            paddingLeft: '16px',
            paddingRight: '16px',
            boxShadow: '0 8px 24px rgba(15,15,18,0.06), 0 2px 8px rgba(15,15,18,0.04)',
            ...styleOverride,
          },
          props: { className: 'gs-card' },
        },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', ...bodyStyle }}>{children}</div>
    </Block>
  );
}
