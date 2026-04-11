import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConversationProvider } from '@elevenlabs/react'
import App from './App.jsx'
import { LocationSessionProvider } from './session/LocationSessionContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LocationSessionProvider>
        <ConversationProvider>
          <App />
        </ConversationProvider>
      </LocationSessionProvider>
    </BrowserRouter>
  </React.StrictMode>
)
