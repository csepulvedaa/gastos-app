'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Inbox, Clock, BarChart2 } from 'lucide-react'

interface Props {
  pendingCount?: number
}

export default function NavBar({ pendingCount = 0 }: Props) {
  const pathname = usePathname()

  const tabs = [
    { href: '/dashboard', label: 'Inicio', icon: Home },
    { href: '/bandeja', label: 'Bandeja', icon: Inbox, badge: pendingCount },
    { href: '/history', label: 'Historial', icon: Clock },
    { href: '/stats', label: 'Stats', icon: BarChart2 },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
