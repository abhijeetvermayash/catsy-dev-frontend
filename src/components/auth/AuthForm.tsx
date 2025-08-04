'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type AuthMode = 'login' | 'signup'

export default function AuthForm() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [organisationName, setOrganisationName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { signUp, signIn, signOut, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'signup') {
      if (!firstName.trim()) {
        setError('First name is required')
        setLoading(false)
        return
      }
      if (!lastName.trim()) {
        setError('Last name is required')
        setLoading(false)
        return
      }
      if (!organisationName.trim()) {
        setError('Organisation name is required')
        setLoading(false)
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long')
        setLoading(false)
        return
      }

      console.log('Starting signup process...')
      const { error } = await signUp(email, password, { firstName, lastName, organisationName })
      
      if (error) {
        console.error('Signup failed:', error)
        setError(`Signup failed: ${error.message}`)
      } else {
        console.log('Signup successful!')
        setMessage('check your email for the confirmation link and then login.')
      }
    } else {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message)
      } else {
        router.push('/dashboard')
      }
    }
    
    setLoading(false)
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
    setError(null)
    setMessage(null)
    setFirstName('')
    setLastName('')
    setOrganisationName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleSignOut = async () => {
    await signOut()
    setError(null)
    setMessage(null)
    setFirstName('')
    setLastName('')
    setOrganisationName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full"></div>
        </div>
      </div>
    )
  }

  // Generate snow positions only on client side to avoid hydration mismatch
  const generateSnowFlakes = (count: number) => {
    if (!mounted) return []
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 8 + Math.random() * 12
    }))
  }

  const generateLargeSnowFlakes = (count: number) => {
    if (!mounted) return []
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 15 + Math.random() * 20
    }))
  }

  const smallSnowFlakes = generateSnowFlakes(100)
  const largeSnowFlakes = generateLargeSnowFlakes(30)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-purple-100 relative overflow-hidden">
      {/* Enhanced Background Pattern - Only render on client */}
      {mounted && (
        <div className="absolute inset-0">
          {/* Animated falling snow */}
          <div className="absolute inset-0 pointer-events-none">
            {smallSnowFlakes.map((flake) => (
              <div
                key={`falling-snow-${flake.id}`}
                className="absolute w-1 h-1 bg-white rounded-full opacity-70 animate-snow-fall"
                style={{
                  left: `${flake.left}%`,
                  animationDelay: `${flake.delay}s`,
                  animationDuration: `${flake.duration}s`
                }}
              />
            ))}
          </div>

          {/* Larger snow flakes */}
          <div className="absolute inset-0 pointer-events-none">
            {largeSnowFlakes.map((flake) => (
              <div
                key={`large-snow-${flake.id}`}
                className="absolute w-2 h-2 bg-white rounded-full opacity-50 animate-snow-fall-slow"
                style={{
                  left: `${flake.left}%`,
                  animationDelay: `${flake.delay}s`,
                  animationDuration: `${flake.duration}s`
                }}
              />
            ))}
          </div>

          {/* Winter trees silhouettes */}
          <div className="absolute bottom-0 left-0 w-1/3 h-2/3 opacity-20">
            <svg viewBox="0 0 300 400" className="w-full h-full">
              <path d="M50 400 L50 300 L30 280 L50 260 L25 240 L50 220 L20 200 L50 180 L15 160 L50 140 L10 120 L50 100 L70 120 L90 100 L90 140 L85 160 L90 180 L80 200 L90 220 L75 240 L90 260 L70 280 L90 300 L90 400 Z" fill="currentColor" className="text-slate-300"/>
              <path d="M150 400 L150 320 L130 300 L150 280 L125 260 L150 240 L120 220 L150 200 L115 180 L150 160 L110 140 L150 120 L170 140 L190 120 L190 160 L185 180 L190 200 L180 220 L190 240 L175 260 L190 280 L170 300 L190 320 L190 400 Z" fill="currentColor" className="text-slate-300"/>
              <path d="M250 400 L250 340 L235 320 L250 300 L230 280 L250 260 L225 240 L250 220 L220 200 L250 180 L215 160 L250 140 L265 160 L280 140 L280 180 L275 200 L280 220 L270 240 L280 260 L265 280 L280 300 L265 320 L280 340 L280 400 Z" fill="currentColor" className="text-slate-300"/>
            </svg>
          </div>
          
          {/* Enhanced curved lines pattern */}
          <svg className="absolute right-0 top-0 h-full w-1/2 opacity-15" viewBox="0 0 400 800" fill="none">
            <path d="M200 0C200 100 150 200 100 300C50 400 0 500 50 600C100 700 200 800 300 800" stroke="currentColor" strokeWidth="3" className="text-purple-300"/>
            <path d="M250 0C250 120 200 240 150 360C100 480 50 600 100 720C150 840 250 960 350 960" stroke="currentColor" strokeWidth="2" className="text-blue-300"/>
            <path d="M300 0C300 80 280 160 260 240C240 320 220 400 240 480C260 560 300 640 340 720" stroke="currentColor" strokeWidth="1" className="text-indigo-200"/>
          </svg>
          
          {/* Enhanced snow-capped mountain range */}
          <div className="absolute bottom-0 right-0 w-2/3 h-2/5 opacity-40">
            <svg viewBox="0 0 500 250" className="w-full h-full">
              <path d="M0 250 L60 200 L120 180 L180 160 L240 140 L300 150 L360 170 L420 180 L480 190 L500 195 L500 250 Z" fill="currentColor" className="text-blue-200"/>
              <path d="M0 250 L80 220 L140 200 L200 180 L260 175 L320 185 L380 195 L440 205 L500 215 L500 250 Z" fill="currentColor" className="text-purple-200"/>
              <path d="M180 160 L200 155 L220 160 L240 140 L260 160 L280 155 L300 150 L320 155 L340 160" stroke="white" strokeWidth="3" fill="none"/>
              <path d="M60 200 L80 195 L100 200 L120 180 L140 200 L160 195 L180 160" stroke="white" strokeWidth="2" fill="none"/>
              <circle cx="200" cy="170" r="8" fill="white" opacity="0.8"/>
              <circle cx="280" cy="165" r="6" fill="white" opacity="0.7"/>
              <circle cx="340" cy="175" r="5" fill="white" opacity="0.6"/>
            </svg>
          </div>

          {/* Clouds */}
          <div className="absolute top-10 left-1/4 w-32 h-16 opacity-30">
            <svg viewBox="0 0 100 40" className="w-full h-full">
              <ellipse cx="25" cy="25" rx="15" ry="10" fill="white"/>
              <ellipse cx="45" cy="20" rx="20" ry="12" fill="white"/>
              <ellipse cx="65" cy="25" rx="15" ry="10" fill="white"/>
            </svg>
          </div>

          <div className="absolute top-20 right-1/3 w-24 h-12 opacity-25">
            <svg viewBox="0 0 80 30" className="w-full h-full">
              <ellipse cx="20" cy="20" rx="12" ry="8" fill="white"/>
              <ellipse cx="35" cy="15" rx="15" ry="10" fill="white"/>
              <ellipse cx="50" cy="20" rx="12" ry="8" fill="white"/>
            </svg>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-gray-800 text-xl font-semibold">Catsy</span>
        </div>
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-gray-600 hover:text-gray-800 transition-colors">Home</Link>
          <button
            onClick={toggleMode}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            {mode === 'signup' ? 'Login' : 'Join'}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-start min-h-[calc(100vh-100px)] px-6">
        <div className="w-full max-w-lg ml-8 lg:ml-16">
          {/* Already Signed In Banner */}
          {user && (
            <div className="mb-8 p-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-800 font-medium">Already signed in</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-all duration-300"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <p className="text-gray-600 text-sm font-medium mb-2 tracking-wider uppercase">
              {mode === 'signup' ? 'START FOR FREE' : 'WELCOME BACK'}
            </p>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-4 leading-tight">
              {mode === 'signup' ? (
                <>Create new account<span className="bg-gradient-to-r from-purple-500 to-violet-600 bg-clip-text text-transparent">.</span></>
              ) : (
                <>Sign in to account<span className="bg-gradient-to-r from-purple-500 to-violet-600 bg-clip-text text-transparent">.</span></>
              )}
            </h1>
            <p className="text-gray-600">
              {mode === 'signup' ? 'Already A Member? ' : "Don't have an account? "}
              <button
                onClick={toggleMode}
                className="bg-gradient-to-r from-purple-500 to-violet-600 bg-clip-text text-transparent hover:from-purple-400 hover:to-violet-500 transition-all font-medium"
                style={{ transitionTimingFunction: 'cubic-bezier(.4, 0, .2, 1)' }}
              >
                {mode === 'signup' ? 'Log In' : 'Sign Up'}
              </button>
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
              <p className="text-sm text-green-600">{message}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      First name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="w-full px-4 py-4 bg-white/80 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-800 placeholder-gray-400 placeholder-opacity-60 shadow-sm"
                        style={{ transitionTimingFunction: 'cubic-bezier(.4, 0, .2, 1)' }}
                        placeholder="Michał"
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Last name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="w-full px-4 py-4 bg-white/80 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-800 placeholder-gray-400 placeholder-opacity-60 shadow-sm"
                        style={{ transitionTimingFunction: 'cubic-bezier(.4, 0, .2, 1)' }}
                        placeholder="Masiak"
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Organisation name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={organisationName}
                      onChange={(e) => setOrganisationName(e.target.value)}
                      required
                      className="w-full px-4 py-4 bg-white/80 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-800 placeholder-gray-400 placeholder-opacity-60 shadow-sm"
                      style={{ transitionTimingFunction: 'cubic-bezier(.4, 0, .2, 1)' }}
                      placeholder="Your Company Name"
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-4 bg-white/80 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-800 placeholder-gray-400 placeholder-opacity-50 shadow-sm"
                  style={{ transitionTimingFunction: 'cubic-bezier(.4, 0, .2, 1)' }}
                  placeholder="michal.masiak@anywhere.co"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-4 pr-12 bg-white/80 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-800 placeholder-gray-400 placeholder-opacity-60 shadow-sm"
                  style={{ transitionTimingFunction: 'cubic-bezier(.4, 0, .2, 1)' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-4 pr-12 bg-white/80 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-gray-800 placeholder-gray-400 placeholder-opacity-50 shadow-sm"
                    style={{ transitionTimingFunction: 'cubic-bezier(.4, 0, .2, 1)' }}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={toggleMode}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-4 px-6 rounded-2xl transition-all duration-300 ease-out flex flex-col items-center justify-center shadow-sm"
                style={{ transitionTimingFunction: 'cubic-bezier(.4, 0, .2, 1)' }}
              >
                <span className="text-base font-semibold">
                  {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                </span>
                <span className="text-xs text-gray-600 mt-1">
                  {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                </span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold py-4 px-6 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/50 transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-purple-500/25"
                style={{ transitionTimingFunction: 'cubic-bezier(.4, 0, .2, 1)' }}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {mode === 'login' ? 'Signing in...' : 'Creating...'}
                  </div>
                ) : (
                  mode === 'login' ? 'Sign in' : 'Create account'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side Content */}
        <div className="hidden lg:flex flex-1 items-center justify-center relative">
          {/* Main Illustration */}
          <div className="relative w-96 h-96">
            {/* Central Circle with Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-violet-600/20 rounded-full blur-3xl animate-pulse"></div>
            
            {/* Floating Elements */}
            <div className="absolute top-8 left-8 w-16 h-16 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg animate-float">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div className="absolute top-16 right-12 w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg animate-float delay-1000">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>

            <div className="absolute bottom-20 left-12 w-14 h-14 bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg animate-float delay-2000">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>

            <div className="absolute bottom-8 right-16 w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg animate-float delay-500">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Central Logo/Brand */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-gradient-to-r from-purple-500 to-violet-600 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-500">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>

            {/* Connecting Lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400">
              <path d="M80 80 L200 200" stroke="url(#gradient1)" strokeWidth="2" strokeDasharray="5,5" opacity="0.6">
                <animate attributeName="stroke-dashoffset" values="0;10" dur="2s" repeatCount="indefinite"/>
              </path>
              <path d="M320 120 L200 200" stroke="url(#gradient2)" strokeWidth="2" strokeDasharray="5,5" opacity="0.6">
                <animate attributeName="stroke-dashoffset" values="0;10" dur="2.5s" repeatCount="indefinite"/>
              </path>
              <path d="M120 320 L200 200" stroke="url(#gradient3)" strokeWidth="2" strokeDasharray="5,5" opacity="0.6">
                <animate attributeName="stroke-dashoffset" values="0;10" dur="3s" repeatCount="indefinite"/>
              </path>
              <path d="M320 320 L200 200" stroke="url(#gradient4)" strokeWidth="2" strokeDasharray="5,5" opacity="0.6">
                <animate attributeName="stroke-dashoffset" values="0;10" dur="1.8s" repeatCount="indefinite"/>
              </path>
              
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.2"/>
                </linearGradient>
                <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.2"/>
                </linearGradient>
                <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.2"/>
                </linearGradient>
                <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0.2"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Feature Highlights */}
          <div className="absolute bottom-16 right-16 space-y-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-gray-200/50 transform hover:scale-105 transition-transform duration-300">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Secure Authentication</p>
                  <p className="text-xs text-gray-600">Enterprise-grade security</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-gray-200/50 transform hover:scale-105 transition-transform duration-300">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Smart Automation</p>
                  <p className="text-xs text-gray-600">10x faster workflows</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Right Logo */}
      <div className="absolute bottom-8 right-8 lg:hidden">
        <div className="flex items-center space-x-2 text-gray-400 opacity-60">
          <div className="flex space-x-1">
            <div className="w-2 h-8 bg-gray-400 rounded-full"></div>
            <div className="w-2 h-6 bg-gray-400 rounded-full"></div>
            <div className="w-2 h-4 bg-gray-400 rounded-full"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
}