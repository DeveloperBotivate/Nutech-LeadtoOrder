import { useState, useEffect, useMemo } from "react"
import DashboardMetrics from "../components/dashboard/DashboardMetrics"
import DashboardCharts from "../components/dashboard/DashboardCharts"
import { getLeadReceiverNames, getCompanies, getSubmittedLeads } from "../utils/storageManager"
import { fmsData } from "../data/dummyData"

function Dashboard() {
  const [salesPerson, setSalesPerson] = useState("All")
  const [division, setDivision] = useState("All")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const [salesPersonOptions, setSalesPersonOptions] = useState([])
  const [divisionOptions, setDivisionOptions] = useState([])

  useEffect(() => {
    try {
      setSalesPersonOptions(getLeadReceiverNames().map(item => item.name))
    } catch (error) {
      console.error("Error loading sales person options:", error)
    }

    // No dedicated Division master exists — derive the option list from
    // whatever divisions are actually in use across companies/leads.
    try {
      const divisions = new Set()
      getCompanies().forEach(c => { if (c.division) divisions.add(c.division) })
      getSubmittedLeads().forEach(l => { if (l.division) divisions.add(l.division) })
      fmsData.forEach(row => { if (row.division) divisions.add(row.division) })
      setDivisionOptions([...divisions].sort())
    } catch (error) {
      console.error("Error loading division options:", error)
    }
  }, [])

  const filters = useMemo(() => ({
    salesPerson,
    division,
    dateFrom,
    dateTo
  }), [salesPerson, division, dateFrom, dateTo])

  const handleReset = () => {
    setSalesPerson("All")
    setDivision("All")
    setDateFrom("")
    setDateTo("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto py-8 px-4">

        <div className="grid grid-cols-1 gap-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Sales Person</label>
                <select
                  value={salesPerson}
                  onChange={(e) => setSalesPerson(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 min-w-[160px]"
                >
                  <option value="All">All Sales Persons</option>
                  {salesPersonOptions.map((name, index) => (
                    <option key={index} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Division</label>
                <select
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 min-w-[160px]"
                >
                  <option value="All">All Divisions</option>
                  {divisionOptions.map((name, index) => (
                    <option key={index} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Reset Filters
              </button>
            </div>
          </div>

          <DashboardMetrics filters={filters} />

          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6">
              <DashboardCharts filters={filters} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
