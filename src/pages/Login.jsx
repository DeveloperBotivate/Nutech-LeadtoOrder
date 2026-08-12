"use client"

import { useState, useContext } from "react"
import { useNavigate } from "react-router-dom"
import { AuthContext } from "../App"
import { users } from "../data/dummyData"
import nutechLogo from "../assests/Nutechlogo.png"

function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useContext(AuthContext)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!username || !password) {
      setError("Please enter both username and password")
      return
    }

    setIsLoading(true)

    try {
      const success = await login(username, password)
      if (success) {
        navigate("/")
      } else {
        setError("Invalid username or password")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-sky-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <img src={nutechLogo} alt="Nutech" className="h-14 w-auto object-contain mx-auto mb-4" />
          <h1 className="text-4xl font-extrabold text-slate-800">
            Leads To Order System
          </h1>
          <p className="text-slate-600">Sign in to access your dashboard</p>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

            {error && <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Enter your username"
                  disabled={isLoading}
                />
              </div>

              <div className="mb-6">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                className={`w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-md transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-600">
              <p className="font-medium text-gray-700 mb-1.5">Demo credentials</p>
              <div className="space-y-1">
                {users.map((u) => (
                  <p key={u.username}>
                    <span className="font-mono font-semibold text-gray-800">{u.username}</span>
                    {" / "}
                    <span className="font-mono font-semibold text-gray-800">{u.password}</span>
                    <span className="text-gray-400"> ({u.userType})</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login