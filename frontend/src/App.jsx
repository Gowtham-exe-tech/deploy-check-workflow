import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ToastProvider } from './components/common/Toast'
import WorkflowList    from './components/WorkflowList'
import WorkflowEditor  from './components/WorkflowEditor'
import RuleBuilder     from './components/RuleBuilder'
import ExecutionView   from './components/ExecutionView'
import AuditLog        from './components/AuditLog'
import ExecutionDetail from './components/AuditLog/ExecutionDetail'
import './index.css'

/* ── Icons ─────────────────────────────────────────────────────────────────── */
function IconWorkflows() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <circle cx="17.5" cy="17.5" r="2.5"/>
    </svg>
  )
}

function IconAudit() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  )
}

function IconSun() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function IconMoon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

function IconLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  )
}

/* ── Sidebar ────────────────────────────────────────────────────────────────── */
function Sidebar({ theme, onToggleTheme }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <div className="sidebar-logo-icon">
            <IconLogo />
          </div>
          <h1>Halleyx Workflow</h1>
        </div>
        <span>Engine v1.0.0</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-label">Main</div>

        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <IconWorkflows />
          Workflows
        </NavLink>

        <NavLink
          to="/audit"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <IconAudit />
          Audit Log
        </NavLink>
      </nav>

      {/* Bottom — theme toggle + meta */}
      <div className="sidebar-bottom">
        <div className="theme-toggle">
          <span className="theme-toggle-label">
            {theme === 'dark' ? <IconMoon /> : <IconSun />}
            {theme === 'dark' ? 'Dark' : 'Light'} mode
          </span>
          <label className="theme-switch">
            <input
              type="checkbox"
              checked={theme === 'light'}
              onChange={onToggleTheme}
            />
            <span className="theme-switch-track" />
            <span className="theme-switch-thumb" />
          </label>
        </div>
        <div className="sidebar-meta">
          SQLite · FastAPI · React
          <br />
          Halleyx Challenge 2026
        </div>
      </div>
    </aside>
  )
}

/* ── Page wrapper with fade animation ───────────────────────────────────────── */
function PageWrapper({ children }) {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-fade">
      {children}
    </div>
  )
}

/* ── Layout ─────────────────────────────────────────────────────────────────── */
function Layout({ children, theme, onToggleTheme }) {
  return (
    <div className="app-shell">
      <Sidebar theme={theme} onToggleTheme={onToggleTheme} />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

/* ── App root ───────────────────────────────────────────────────────────────── */
export default function App() {
  // Read saved theme preference, default to dark
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('wf-theme') || 'dark'
  })

  // Apply theme to <html> element via data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('wf-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <BrowserRouter>
      <ToastProvider>
        <Layout theme={theme} onToggleTheme={toggleTheme}>
          <Routes>
            <Route path="/" element={
              <PageWrapper><WorkflowList /></PageWrapper>
            }/>
            <Route path="/workflows/new" element={
              <PageWrapper><WorkflowEditor /></PageWrapper>
            }/>
            <Route path="/workflows/:id" element={
              <PageWrapper><WorkflowEditor /></PageWrapper>
            }/>
            <Route path="/workflows/:id/execute" element={
              <PageWrapper><ExecutionView /></PageWrapper>
            }/>
            <Route path="/steps/:stepId/rules" element={
              <PageWrapper><RuleBuilder /></PageWrapper>
            }/>
            <Route path="/audit" element={
              <PageWrapper><AuditLog /></PageWrapper>
            }/>
            <Route path="/executions/:id" element={
              <PageWrapper><ExecutionDetail /></PageWrapper>
            }/>
          </Routes>
        </Layout>
      </ToastProvider>
    </BrowserRouter>
  )
}
