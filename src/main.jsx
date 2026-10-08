import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/app.css'
import './styles/quiz.css'
import './styles/exam.css'
import './styles/streak.css'
import './styles/screens.css'
import './styles/modals.css'
import './styles/analytics.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
