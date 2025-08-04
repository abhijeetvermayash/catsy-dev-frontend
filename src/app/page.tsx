'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      console.log('User already authenticated, redirecting to dashboard...')
      router.push('/dashboard')
    }
  }, [user, loading, router])

  useEffect(() => {
    setIsVisible(true)
    setMounted(true)
  }, [])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-purple-100 relative overflow-hidden">
      {/* Winter Snow Animation Background - Only render on client */}
      {mounted && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Animated falling snow */}
          <div className="absolute inset-0">
            {smallSnowFlakes.map((flake) => (
              <div
                key={`falling-snow-${flake.id}`}
                className="absolute w-1 h-1 bg-white rounded-full opacity-60 animate-snow-fall"
                style={{
                  left: `${flake.left}%`,
                  animationDelay: `${flake.delay}s`,
                  animationDuration: `${flake.duration}s`
                }}
              />
            ))}
          </div>

          {/* Larger snow flakes */}
          <div className="absolute inset-0">
            {largeSnowFlakes.map((flake) => (
              <div
                key={`large-snow-${flake.id}`}
                className="absolute w-2 h-2 bg-white rounded-full opacity-40 animate-snow-fall-slow"
                style={{
                  left: `${flake.left}%`,
                  animationDelay: `${flake.delay}s`,
                  animationDuration: `${flake.duration}s`
                }}
              />
            ))}
          </div>

        {/* Winter background elements - Mountains */}
        <div className="absolute bottom-0 left-0 w-full h-1/3 opacity-15">
          <svg viewBox="0 0 1200 400" className="w-full h-full">
            {/* Background mountains */}
            <path d="M0 400 L200 250 L400 200 L600 150 L800 180 L1000 120 L1200 160 L1200 400 Z" fill="currentColor" className="text-blue-300"/>
            <path d="M0 400 L150 300 L350 250 L550 200 L750 230 L950 170 L1200 200 L1200 400 Z" fill="currentColor" className="text-blue-200"/>
            
            {/* Foreground mountains */}
            <path d="M0 400 L100 350 L300 300 L500 250 L700 280 L900 220 L1200 250 L1200 400 Z" fill="currentColor" className="text-blue-100"/>
          </svg>
        </div>

        {/* Winter trees */}
        <div className="absolute bottom-0 right-1/4 w-32 h-32 opacity-20">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Tree trunk */}
            <rect x="48" y="80" width="4" height="20" fill="currentColor" className="text-gray-600"/>
            {/* Tree layers */}
            <path d="M50 20 L35 45 L65 45 Z" fill="currentColor" className="text-green-700"/>
            <path d="M50 30 L38 50 L62 50 Z" fill="currentColor" className="text-green-600"/>
            <path d="M50 40 L40 60 L60 60 Z" fill="currentColor" className="text-green-500"/>
            {/* Snow on tree */}
            <path d="M50 20 L37 43 L63 43 Z" fill="white" opacity="0.6"/>
          </svg>
        </div>

        {/* More winter trees */}
        <div className="absolute bottom-0 left-1/3 w-24 h-24 opacity-15">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <rect x="48" y="85" width="4" height="15" fill="currentColor" className="text-gray-600"/>
            <path d="M50 25 L38 48 L62 48 Z" fill="currentColor" className="text-green-700"/>
            <path d="M50 35 L40 55 L60 55 Z" fill="currentColor" className="text-green-600"/>
            <path d="M50 25 L40 46 L60 46 Z" fill="white" opacity="0.5"/>
          </svg>
        </div>

        {/* Clouds */}
        <div className="absolute top-10 left-1/4 w-40 h-20 opacity-30">
          <svg viewBox="0 0 200 100" className="w-full h-full">
            <ellipse cx="50" cy="60" rx="35" ry="25" fill="white"/>
            <ellipse cx="80" cy="50" rx="40" ry="30" fill="white"/>
            <ellipse cx="120" cy="55" rx="35" ry="25" fill="white"/>
            <ellipse cx="150" cy="65" rx="30" ry="20" fill="white"/>
          </svg>
        </div>

        <div className="absolute top-20 right-1/3 w-32 h-16 opacity-25">
          <svg viewBox="0 0 160 80" className="w-full h-full">
            <ellipse cx="40" cy="50" rx="30" ry="20" fill="white"/>
            <ellipse cx="70" cy="40" rx="35" ry="25" fill="white"/>
            <ellipse cx="100" cy="45" rx="30" ry="20" fill="white"/>
          </svg>
        </div>
      </div>
      )}

      {/* Navigation */}
      <nav className="relative z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-all duration-300 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Catsy
              </span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-purple-600 font-medium transition-all duration-300 hover:scale-105 relative group">
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-purple-600 font-medium transition-all duration-300 hover:scale-105 relative group">
                How it Works
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-purple-600 font-medium transition-all duration-300 hover:scale-105 relative group">
                Pricing
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              <Link
                href="/auth"
                className="text-gray-600 hover:text-purple-600 font-medium transition-all duration-300 hover:scale-105"
              >
                Login
              </Link>
              <Link
                href="/auth"
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-purple-500/25"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge */}
            <div className={`inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-8 transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Trusted by 1000+ e-commerce brands
            </div>

            {/* Main Headline */}
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-bold text-gray-900 mb-8 leading-tight transform transition-all duration-1000 delay-200 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              Stop Drowning in{' '}
              <span className="bg-gradient-to-r from-purple-500 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                Spreadsheets
              </span>
            </h1>

            {/* Subtitle */}
            <p className={`text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-12 leading-relaxed transform transition-all duration-1000 delay-400 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              Transform your e-commerce workflow with our intelligent automation platform. 
              Generate perfect listings for Amazon, Flipkart, and more in{' '}
              <span className="font-semibold text-purple-600">minutes, not hours</span>.
            </p>

            {/* CTA Buttons */}
            <div className={`flex justify-center items-center mb-16 transform transition-all duration-1000 delay-600 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <Link
                href="/auth"
                className="group inline-flex items-center bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-purple-500/25"
              >
                Start Free Trial
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* Stats */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto transform transition-all duration-1000 delay-800 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <div className="text-center group">
                <div className="text-3xl font-bold text-purple-600 group-hover:scale-110 transition-transform duration-300">10x</div>
                <div className="text-gray-600 font-medium">Faster Listings</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl font-bold text-indigo-600 group-hover:scale-110 transition-transform duration-300">99%</div>
                <div className="text-gray-600 font-medium">Error Reduction</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">24/7</div>
                <div className="text-gray-600 font-medium">Automation</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Before/After Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm relative" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Before Section */}
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">The Problem</h2>
            <p className="text-xl text-gray-600 mb-12">Manual spreadsheet chaos is killing your productivity</p>
            
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-3xl shadow-2xl border border-red-200 p-8 transform hover:scale-105 transition-all duration-500 hover:shadow-3xl">
                <div className="space-y-4 mb-6">
                  <div className="h-4 bg-gradient-to-r from-red-200 to-red-300 rounded-full w-full animate-pulse"></div>
                  <div className="h-4 bg-gradient-to-r from-red-200 to-red-300 rounded-full w-3/4 animate-pulse delay-100"></div>
                  <div className="h-4 bg-gradient-to-r from-red-200 to-red-300 rounded-full w-5/6 animate-pulse delay-200"></div>
                  <div className="h-4 bg-gradient-to-r from-red-200 to-red-300 rounded-full w-2/3 animate-pulse delay-300"></div>
                  <div className="h-4 bg-gradient-to-r from-red-200 to-red-300 rounded-full w-4/5 animate-pulse delay-400"></div>
                </div>
                <div className="flex items-center justify-center space-x-2 text-red-600 font-semibold">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Hours of manual work, errors, frustration
                </div>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center mb-20">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center animate-bounce shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>

          {/* After Section */}
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">The Solution</h2>
            <p className="text-xl text-gray-600 mb-12">Automated perfection with Catsy</p>
            
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-3xl shadow-2xl border border-green-200 p-8 transform hover:scale-105 transition-all duration-500 hover:shadow-3xl">
                <div className="flex justify-center space-x-6 mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg transform hover:rotate-6 transition-transform duration-300">
                    AMZ
                  </div>
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg transform hover:rotate-6 transition-transform duration-300 delay-100">
                    FK
                  </div>
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg transform hover:rotate-6 transition-transform duration-300 delay-200">
                    MYN
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-2 text-green-600 font-semibold">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Perfect listings in minutes, not hours
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">Why Choose Catsy?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the future of e-commerce automation with our intelligent platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-white rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 border border-gray-100 hover:border-purple-200">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors duration-300">Lightning Fast</h3>
              <p className="text-gray-600 leading-relaxed">
                Generate perfect listings in minutes instead of hours. Our AI-powered platform handles all the heavy lifting while you focus on growing your business.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 border border-gray-100 hover:border-green-200">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-green-600 transition-colors duration-300">Multi-Platform</h3>
              <p className="text-gray-600 leading-relaxed">
                Support for Amazon, Flipkart, Myntra, and more. One powerful platform for all your marketplace needs with seamless integration.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 border border-gray-100 hover:border-orange-200">
              <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-orange-600 transition-colors duration-300">Error-Free</h3>
              <p className="text-gray-600 leading-relaxed">
                Eliminate manual errors with our intelligent validation and formatting system. Get perfect listings every single time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {/* <section className="py-20 bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Loved by E-commerce Brands</h2>
            <p className="text-xl text-gray-600">See what our customers are saying</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">
                  "Catsy transformed our listing process completely. What used to take days now takes minutes!"
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                    {String.fromCharCode(64 + i)}
                  </div>
                  <div className="ml-4">
                    <div className="font-semibold text-gray-900">Brand Owner {i}</div>
                    <div className="text-gray-500 text-sm">E-commerce Company</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Pricing Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white relative" id="pricing">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Simple Pricing</h2>
            <p className="text-xl text-gray-600 mb-8">Get started with our powerful automation platform</p>
          </div>

          {/* Pricing Card */}
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 transform hover:scale-105 transition-all duration-300 hover:shadow-3xl relative overflow-hidden">
              {/* Stealth Mode Badge */}
              <div className="absolute top-4 right-4">
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                  STEALTH MODE
                </div>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Early Access</h3>
                <div className="flex items-center justify-center mb-4">
                  <span className="text-5xl font-bold text-gray-900">$0</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-2xl p-4 mb-6">
                  <p className="text-purple-700 font-semibold text-lg">
                    Since we are in stealth mode, this is free
                  </p>
                  <p className="text-purple-600 text-sm mt-1">
                    Get lifetime access to all premium features
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Unlimited listings</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">All marketplace integrations</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Priority support</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Advanced automation features</span>
                </div>
              </div>

              <Link
                href="/auth"
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl inline-block text-center"
              >
                Claim Your Free Access
              </Link>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm">
              🚀 Limited time offer • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join thousands of e-commerce brands who&apos;ve eliminated spreadsheet chaos and boosted their productivity by 10x
          </p>
          <div className="flex justify-center items-center">
            <Link
              href="/auth"
              className="group inline-flex items-center bg-white hover:bg-gray-50 text-purple-600 font-bold text-lg px-8 py-4 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
            >
              Start Your Free Trial Today
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
          <p className="text-purple-200 text-sm mt-4">No credit card required • 14-day free trial</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold">Catsy</span>
              </div>
              <p className="text-gray-400 max-w-md">
                Transform your e-commerce workflow with intelligent automation. Stop drowning in spreadsheets and start scaling your business.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Catsy. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
