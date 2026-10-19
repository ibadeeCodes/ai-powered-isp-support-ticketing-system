import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { HeaderNav } from '@/components/HeaderNav';

export const metadata: Metadata = {
  title: 'ISP AI Support Ticketing System',
  description: 'AI-Native Support Ticketing and Network Diagnostics Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
        <AuthProvider>
          <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-lg shadow-black/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              {/* Brand */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
                  {/* Inline SVG to keep layout.tsx a server component */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                    <line x1="12" y1="20" x2="12.01" y2="20" />
                  </svg>
                </div>
                <div>
                  <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    ISP AI Support
                  </span>
                  <span className="block text-xs text-slate-400 font-medium">Ticketing Portal</span>
                </div>
              </div>

              {/* Nav — client component for auth context */}
              <HeaderNav />
            </div>
          </header>

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          <footer className="border-t border-slate-800 bg-slate-900 py-6 text-center text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} Internet Service Provider AI Support Ticketing System.</p>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
