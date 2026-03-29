import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomeScreen from '@/pages/HomeScreen'
import SessionView from '@/pages/SessionView'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/session/:sessionId" element={<SessionView />} />
      </Routes>
    </BrowserRouter>
  )
}
