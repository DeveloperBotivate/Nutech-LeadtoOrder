import { MenuIcon } from "./Icons"
import { useContext } from "react"
import { AuthContext } from "../App"
import { useLocation } from "react-router-dom"

function MainNav({ logout, setMobileMenuOpen }) {
  const { currentUser, userType, isAdmin } = useContext(AuthContext)
  const location = useLocation()

  const getPageHeader = () => {
    const path = location.pathname
    if (path === "/") return {
      title: "Leads To Order System",
      description: "Monitor your sales pipeline and track conversions in real-time"
    }
    if (path.startsWith("/leads")) return {
      title: "Lead Management",
      description: "Enter the details of the new lead"
    }
    if (path.startsWith("/follow-up")) return {
      title: "Call Tracker",
      description: ""
    }
    if (path.startsWith("/master")) return {
      title: "Master",
      description: "Manage the master data used across the system"
    }
    return { title: "", description: "" }
  }

  const { title, description } = getPageHeader()

  return (
    <header className="sticky top-0 z-40 flex h-auto min-h-[4rem] w-full items-center justify-between border-b bg-white px-4 py-2 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <button
          type="button"
          className="text-slate-500 hover:text-slate-700 focus:outline-none md:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <MenuIcon className="h-6 w-6" />
        </button>

        <div className="flex flex-col">
          {title && <h1 className="text-xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">{title}</h1>}
          {description && <p className="text-sm text-slate-500 hidden md:block">{description}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* User profile section removed from here as requested */}
      </div>
    </header>
  )
}

export default MainNav