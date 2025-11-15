import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LectureListPage } from './pages/LectureListPage'
import { LecturePlayerPage } from './pages/LecturePlayerPage'
import { LandingPage } from './pages/LandingPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lectures" element={<LectureListPage />} />
        <Route path="/lecture/:lectureId" element={<LecturePlayerPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
