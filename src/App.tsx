
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LectureListPage } from './pages/LectureListPage'
import { LecturePlayerPage } from './pages/LecturePlayerPage'
import GlassHome from './pages/GlassHome'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GlassHome />} />
        <Route path="/landing-fx" element={<GlassHome />} />
        <Route path="/lectures" element={<LectureListPage />} />
        <Route path="/lecture/:lectureId" element={<LecturePlayerPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
