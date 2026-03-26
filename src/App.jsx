import { Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation.jsx'
import Dashboard from './components/Dashboard.jsx'
import UploadScreen from './components/UploadScreen.jsx'
import ScanHistory from './components/ScanHistory.jsx'
import Predictions from './components/Predictions.jsx'
import ScanDetail from './components/ScanDetail.jsx'

export default function App() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="mx-auto" style={{ maxWidth: '428px' }}>
        <main className="pb-20 min-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadScreen />} />
            <Route path="/history" element={<ScanHistory />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/scan/:id" element={<ScanDetail />} />
          </Routes>
        </main>
        <Navigation />
      </div>
    </div>
  )
}
