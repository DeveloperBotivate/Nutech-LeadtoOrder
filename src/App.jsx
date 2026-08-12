"use client"

import { useState, useEffect, createContext } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Leads from "./pages/Leads"
import FollowUp from "./pages/FollowUp"
import NewFollowUp from "./pages/NewFollowUp"
// import Quotation from "./pages/Quotation"
import Quotation from "./pages/Quotation/Quotation"
import AdvancePayment from "./pages/AdvancePayment"
import Master from "./pages/master/Master"
import MainNav from "./components/MainNav"
import Footer from "./components/Footer"
import Notification from "./components/Notification"
import Sidebar from "./components/Sidebar"
import { mockApi } from "./services/mockApi"

// Create auth context
export const AuthContext = createContext(null)
// Create data context to manage data access based on user type
export const DataContext = createContext(null)

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [notification, setNotification] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [userType, setUserType] = useState(null)
  const [userData, setUserData] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Check if user is already logged in
  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated")
    const storedUser = localStorage.getItem("currentUser")
    const storedUserType = localStorage.getItem("userType")

    if (auth === "true" && storedUser) {
      setIsAuthenticated(true)
      setCurrentUser(JSON.parse(storedUser))
      setUserType(storedUserType)
      // Fetch data based on user type
      fetchUserData(JSON.parse(storedUser).username, storedUserType)
    }
  }, [])

  // Function to fetch data based on user type
  const fetchUserData = async (username, userType) => {
    try {
      // Use mock API instead of Google Sheets
      const data = await mockApi.fetchUserData(username, userType)
      setUserData(data)
    } catch (error) {
      console.error("Data fetching error:", error)
      showNotification("An error occurred while fetching data", "error")
    }
  }

  const login = async (username, password) => {
    try {
      // Use mock API for login
      const result = await mockApi.login(username, password)

      if (result.success) {
        const userInfo = result.user

        setIsAuthenticated(true)
        setCurrentUser(userInfo)
        setUserType(userInfo.userType)

        localStorage.setItem("isAuthenticated", "true")
        localStorage.setItem("currentUser", JSON.stringify(userInfo))
        localStorage.setItem("userType", userInfo.userType)

        // Fetch data based on user type
        await fetchUserData(userInfo.username, userInfo.userType)

        showNotification(`Welcome, ${username}! (${userInfo.userType})`, "success")
        return true
      } else {
        showNotification(result.message || "Invalid credentials", "error")
        return false
      }
    } catch (error) {
      console.error("Login error:", error)
      showNotification("An error occurred during login", "error")
      return false
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
    setUserType(null)
    setUserData(null)
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("currentUser")
    localStorage.removeItem("userType")
    showNotification("Logged out successfully", "success")
  }

  const showNotification = (message, type = "info") => {
    setNotification({ message, type })
    setTimeout(() => {
      setNotification(null)
    }, 3000)
  }

  // Check if user has admin privileges
  const isAdmin = () => {
    return userType === "admin"
  }

  // Protected route component
  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />
    }

    // If admin-only route and user is not admin, redirect to dashboard
    if (adminOnly && !isAdmin()) {
      showNotification("You don't have permission to access this page", "error")
      return <Navigate to="/" />
    }

    return children
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      login,
      logout,
      showNotification,
      currentUser,
      userType,
      isAdmin: isAdmin
    }}>
      <DataContext.Provider value={{ userData, fetchUserData }}>
        <Router>
          <div className="flex h-screen bg-slate-50 text-gray-900 overflow-hidden">
            {isAuthenticated && (
              <Sidebar
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
              />
            )}

            <div className="flex flex-1 flex-col overflow-hidden">
              {isAuthenticated && (
                <MainNav
                  logout={logout}
                  setMobileMenuOpen={setMobileMenuOpen}
                />
              )}

              <main className="flex-1 overflow-auto p-4 md:p-6">
                <Routes>
                  <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/leads"
                    element={
                      <ProtectedRoute>
                        <Leads />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/follow-up"
                    element={
                      <ProtectedRoute>
                        <FollowUp />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/follow-up/new"
                    element={
                      <ProtectedRoute>
                        <NewFollowUp />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/quotation"
                    element={
                      <ProtectedRoute>
                        <Quotation />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/advance-payment"
                    element={
                      <ProtectedRoute>
                        <AdvancePayment />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/master"
                    element={
                      <ProtectedRoute>
                        <Master />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
              {isAuthenticated && <div className="bg-white border-t"><Footer /></div>}
            </div>

            {notification && <Notification message={notification.message} type={notification.type} />}
          </div>
        </Router>
      </DataContext.Provider>
    </AuthContext.Provider>
  )
}

export default App