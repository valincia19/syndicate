import { BrowserRouter, Routes, Route } from "react-router-dom"
import Landing from "./pages/Landing"
import NextGenExecutionPreview from "./pages/NextGenExecutionPreview"
import AntiBanProtection from "./pages/AntiBanProtection"
import DiscordWhitelist from "./pages/DiscordWhitelist"
import ScriptUIPreview from "./pages/ScriptUIPreview"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/hero-1" element={<NextGenExecutionPreview />} />
        <Route path="/hero-2" element={<AntiBanProtection />} />
        <Route path="/hero-3" element={<DiscordWhitelist />} />
        <Route path="/hero-4" element={<ScriptUIPreview />} />
      </Routes>
    </BrowserRouter>
  )
}
