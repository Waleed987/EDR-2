import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ProcessControl from './pages/ProcessControl'
import YaraScanner from './pages/YaraScanner'
import VirusTotal from './pages/VirusTotal'
import AIModelManager from './pages/AIModelManager'
import AlertSystem from './pages/AlertSystem'
import './App.css'

function App() {
  return (
    <>
       <BrowserRouter>
      <Routes>
        <Route path='/' element={<Dashboard/>}/>
        <Route path='/control' element={<ProcessControl/>}/>
        <Route path='/yara' element={<YaraScanner/>}/>
        <Route path='/virustotal' element={<VirusTotal/>}/>
        <Route path='/ai-models' element={<AIModelManager/>}/>
        <Route path='/alerts' element={<AlertSystem/>}/>
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
