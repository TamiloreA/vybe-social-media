"use client"

import { useState, useEffect } from "react"
import SignInPage from "./auth/signin/page"
import SignUpPage from "./auth/signup/page"
import GetStartedPage from "./onboarding/get-started/page"
import MainApp from "./components/main-app"
import { authAPI } from "@/lib/api"

export default function App() {
  const [currentPage, setCurrentPage] = useState<"signin" | "signup" | "getstarted" | "main" | "loading">("loading")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("authToken")
        
        if (!token) {
          setCurrentPage("signin")
          return
        }
        
        // Verify token by fetching current user
        const user = await authAPI.getCurrentUser()
        setIsAuthenticated(true)
        
        if (localStorage.getItem("isNewUser") === "true") {
          setCurrentPage("getstarted")
          setIsNewUser(true)
        } else {
          setCurrentPage("main")
        }
      } catch (error) {
        // Token is invalid or expired
        localStorage.removeItem("authToken")
        localStorage.removeItem("isNewUser")
        setCurrentPage("signin")
      }
    }
    
    checkAuth()
  }, [])

  const handleSignIn = (token: string) => {
    localStorage.setItem("authToken", token)
    localStorage.removeItem("isNewUser")
    setIsAuthenticated(true)
    setCurrentPage("main")
  }

  const handleSignUp = (token: string) => {
    localStorage.setItem("authToken", token)
    localStorage.setItem("isNewUser", "true")
    setIsAuthenticated(true)
    setIsNewUser(true)
    setCurrentPage("getstarted")
  }

  const handleGetStartedComplete = () => {
    localStorage.removeItem("isNewUser")
    setIsNewUser(false)
    setCurrentPage("main")
  }

  const handleSignOut = () => {
    localStorage.removeItem("authToken")
    localStorage.removeItem("isNewUser")
    setIsAuthenticated(false)
    setIsNewUser(false)
    setCurrentPage("signin")
  }

  // Show loading spinner while checking auth status
  if (currentPage === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  // Render appropriate page based on state
  if (currentPage === "main" && isAuthenticated) {
    return <MainApp onSignOut={handleSignOut} />
  }

  if (currentPage === "getstarted" && isAuthenticated && isNewUser) {
    return <GetStartedPage onComplete={handleGetStartedComplete} />
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {currentPage === "signin" && (
        <SignInPage onSignIn={handleSignIn} onSwitchToSignUp={() => setCurrentPage("signup")} />
      )}
      {currentPage === "signup" && (
        <SignUpPage onSignUp={handleSignUp} onSwitchToSignIn={() => setCurrentPage("signin")} />
      )}
    </div>
  )
}