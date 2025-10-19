import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from './contexts/AuthContext'
import { WebSocketProvider } from './contexts/WebSocketContext'

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <Pages />
        <Toaster />
      </WebSocketProvider>
    </AuthProvider>
  )
}

export default App