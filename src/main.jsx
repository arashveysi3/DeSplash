import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider as StyletronProvider } from 'styletron-react'
import { Client as Styletron } from 'styletron-engine-atomic'
import { BaseProvider } from 'baseui'
import { theme } from './theme'
import App from './App.jsx'
import './index.css'

const engine = new Styletron()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StyletronProvider value={engine}>
      <BaseProvider theme={theme}>
        <App />
      </BaseProvider>
    </StyletronProvider>
  </StrictMode>,
)
