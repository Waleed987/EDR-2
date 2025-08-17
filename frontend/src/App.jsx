import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ProcessControl from './pages/ProcessControl'
import './App.css'

function App() {
  return (
    <>
       <BrowserRouter>
      <Routes>
        <Route path='/' element={<Dashboard/>}/>
        <Route path='/control' element={<ProcessControl/>}/>
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
