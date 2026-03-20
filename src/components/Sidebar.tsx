'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  userName: string
  userEmail: string
  userInitial: string
}

const navItems = [
  { icon: <IconDashboard />, label: 'Dashboard', color: '#00c896', href: '/dashboard', section: 'main' },
  { icon: <IconSearch />, label: 'Search Players', color: '#6c8fff', href: '/search', section: 'main' },
  { icon: <IconDatabase />, label: 'My Database', color: '#00c896', href: '/databases', section: 'main' },
  { icon: <IconReports />, label: 'Reports', color: '#ff9f43', href: '/reports', section: 'tools' },
  { icon: <IconCalendar />, label: 'Calendar', color: '#ff6b9d', href: '/calendar', section: 'tools' },
  { icon: <IconSettings />, label: 'Settings', color: '#8b8fa8', href: '/settings', section: 'tools' },
]

export default function Sidebar({ userName, userEmail, userInitial }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 flex flex-col border-r border-white/5 flex-shrink-0" style={{
      background: 'linear-gradient(180deg, #141720 0%, #111318 100%)',
      boxShadow: '4px 0 24px rgba(0,0,0,0.4)'
    }}>
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl blur-md opacity-40" style={{ background: '#00c896' }} />
            <div className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{
              background: '#0f1117',
              border: '2px solid #00c896',
              boxShadow: '0 0 10px rgba(0,200,150,0.3)'
            }}>
              <svg width="22" height="22" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="ballFadeSidebar" cx="50%" cy="50%" r="50%">
                    <stop offset="40%" stopColor="#00c896" stopOpacity="1"/>
                    <stop offset="100%" stopColor="#00c896" stopOpacity="0"/>
                  </radialGradient>
                </defs>
                <circle cx="50" cy="50" r="46" fill="url(#ballFadeSidebar)"/>
              </svg>
            </div>
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-wide">ScoutLink</span>
            <p className="text-[10px] text-[#00c896]/70 tracking-widest uppercase">Pro</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 flex flex-col gap-1">
        <p className="text-[10px] text-white/20 uppercase tracking-widest px-3 mb-2">Main</p>
        {navItems.filter(i => i.section === 'main').map(item => (
          <NavItem key={item.label} icon={item.icon} label={item.label} color={item.color} href={item.href} active={pathname === item.href} />
        ))}
        <p className="text-[10px] text-white/20 uppercase tracking-widest px-3 mt-4 mb-2">Tools</p>
        {navItems.filter(i => i.section === 'tools').map(item => (
          <NavItem key={item.label} icon={item.icon} label={item.label} color={item.color} href={item.href} active={pathname === item.href} />
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #00c896, #00a878)', boxShadow: '0 0 10px rgba(0,200,150,0.4)' }}>
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs truncate" style={{ color: '#00c896', opacity: 0.7 }}>{userEmail}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function NavItem({ icon, label, active, color, href }: { icon: React.ReactNode; label: string; active?: boolean; color: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
      style={active ? {
        background: `linear-gradient(135deg, ${color}18, ${color}06)`,
      } : {}}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = ''
        }
      }}
    >
      <span className="w-4 h-4 flex-shrink-0" style={{ color }}>{icon}</span>
      <span className="text-sm font-medium" style={{ color: active ? 'white' : 'rgba(255,255,255,0.5)' }}>{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />}
    </Link>
  )
}

function IconDashboard() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg> }
function IconSearch() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg> }
function IconDatabase() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4S4 11.21 4 9zm0 5v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z"/></svg> }
function IconReports() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg> }
function IconCalendar() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg> }
function IconSettings() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg> }
