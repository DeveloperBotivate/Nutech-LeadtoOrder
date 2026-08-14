"use client"

import { useState, useEffect, useContext } from "react"
import { AuthContext } from "../App"
import { mockApi } from "../services/mockApi"
import DataTable from "../components/DataTable"
import { SearchIcon, DownloadIcon } from "../components/Icons"
import nutechLogo from "../assests/Nutechlogo.png"
import { buildQuotationPdf } from "./Quotation/Quotation"

const fadeIn = "animate-in fade-in duration-300"
const slideIn = "animate-in slide-in-from-right duration-300"

function AdvancePayment() {
  const { showNotification } = useContext(AuthContext)

  const [activeTab, setActiveTab] = useState("pending")
  const [pendingEntries, setPendingEntries] = useState([])
  const [historyEntries, setHistoryEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  // Company / Division filters — shared across Pending and History, option
  // lists sourced from whichever tab's data is currently active.
  const [companyFilter, setCompanyFilter] = useState("all")
  const [divisionFilter, setDivisionFilter] = useState("all")
  const [showColumnDropdown, setShowColumnDropdown] = useState(false)

  // Column visibility — Actions/Quotation No. always shown as anchors, the
  // rest toggleable. All columns visible by default.
  const [pendingVisibleColumns, setPendingVisibleColumns] = useState({
    leadNo: true,
    companyName: true,
    division: true,
    date: true,
    freightType: true,
    totalAmount: true,
    advancePayment: true,
    advanceAmount: true,
    status: true,
    quotation: true,
  })
  const [historyVisibleColumns, setHistoryVisibleColumns] = useState({
    updated: true,
    leadNo: true,
    companyName: true,
    division: true,
    advanceAmount: true,
    receivedAdvance: true,
    status: true,
    remarks: true,
  })

  const pendingColumnOptions = [
    { key: "leadNo", label: "Lead No." },
    { key: "companyName", label: "Company Name" },
    { key: "division", label: "Division" },
    { key: "date", label: "Date" },
    { key: "freightType", label: "Freight Type" },
    { key: "totalAmount", label: "Total Amount" },
    { key: "advancePayment", label: "Advance Payment" },
    { key: "advanceAmount", label: "Advance Amount" },
    { key: "status", label: "Status" },
    { key: "quotation", label: "Quotation" },
  ]

  const historyColumnOptions = [
    { key: "updated", label: "Updated" },
    { key: "leadNo", label: "Lead No." },
    { key: "companyName", label: "Company Name" },
    { key: "division", label: "Division" },
    { key: "advanceAmount", label: "Advance Amount" },
    { key: "receivedAdvance", label: "Received Advance" },
    { key: "status", label: "Status" },
    { key: "remarks", label: "Remarks" },
  ]

  const handlePendingColumnToggle = (columnKey) => {
    setPendingVisibleColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }))
  }

  const handlePendingSelectAll = () => {
    const allSelected = Object.values(pendingVisibleColumns).every(Boolean)
    setPendingVisibleColumns(Object.fromEntries(Object.keys(pendingVisibleColumns).map((key) => [key, !allSelected])))
  }

  const handleHistoryColumnToggle = (columnKey) => {
    setHistoryVisibleColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }))
  }

  const handleHistorySelectAll = () => {
    const allSelected = Object.values(historyVisibleColumns).every(Boolean)
    setHistoryVisibleColumns(Object.fromEntries(Object.keys(historyVisibleColumns).map((key) => [key, !allSelected])))
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnDropdown && !event.target.closest(".relative")) {
        setShowColumnDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showColumnDropdown])

  const [showPopup, setShowPopup] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Popup form state
  const [advanceAmount, setAdvanceAmount] = useState("")
  const [receivedAdvance, setReceivedAdvance] = useState("")
  const [status, setStatus] = useState("")
  const [remarks, setRemarks] = useState("")

  const [logoDataUri, setLogoDataUri] = useState("")

  useEffect(() => {
    fetch(nutechLogo)
      .then((res) => res.blob())
      .then((blob) => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      }))
      .then(setLogoDataUri)
      .catch((error) => console.error("Error loading logo for PDF:", error))
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const data = await mockApi.fetchAdvancePayments()
      setPendingEntries(data.pending || [])
      setHistoryEntries(data.history || [])
    } catch (error) {
      console.error("Error fetching advance payment data:", error)
      setPendingEntries([])
      setHistoryEntries([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Opens the quotation's saved PDF dynamically by rebuilding it from the
  // quotation data, avoiding massive data URI bloat in localStorage.
  const handleViewQuotation = (entry) => {
    if (!entry.quotationData) {
      showNotification("Quotation details are not available to generate PDF.", "error")
      return
    }
    try {
      const doc = buildQuotationPdf(entry.quotationData, logoDataUri)
      doc.save(`Quotation_${(entry.quotationNo || "quotation").replace(/\//g, "-")}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      showNotification("Failed to generate PDF", "error")
    }
  }

  useEffect(() => {
    // Company/Division filter options are sourced from whichever tab's
    // dataset is active, so reset the selections on every tab switch.
    setCurrentPage(1)
    setCompanyFilter("all")
    setDivisionFilter("all")
  }, [activeTab])

  const openPopup = (entry) => {
    setSelectedEntry(entry)
    setAdvanceAmount(entry.advanceAmount || "")
    setReceivedAdvance(entry.receivedAdvance || "")
    setStatus(entry.status || "")
    setRemarks(entry.remarks || "")
    setShowPopup(true)
  }

  const closePopup = () => {
    setShowPopup(false)
    setSelectedEntry(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedEntry) return

    setIsSubmitting(true)
    try {
      const result = await mockApi.submitAdvancePaymentUpdate(selectedEntry.quotationNo, {
        advanceAmount,
        receivedAdvance,
        status,
        remarks,
      })

      if (result.success) {
        showNotification("Advance payment status updated", "success")
        closePopup()
        await fetchData()
      } else {
        showNotification("Error updating status: " + (result.error || "Unknown error"), "error")
      }
    } catch (error) {
      showNotification("Error updating status: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const matchesSearch = (entry) => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (
      (entry.quotationNo && entry.quotationNo.toLowerCase().includes(q)) ||
      (entry.companyName && entry.companyName.toLowerCase().includes(q)) ||
      (entry.division && entry.division.toLowerCase().includes(q))
    )
  }

  const matchesCompanyFilter = (entry) => companyFilter === "all" || entry.companyName === companyFilter
  const matchesDivisionFilter = (entry) => divisionFilter === "all" || entry.division === divisionFilter

  const filteredPending = pendingEntries.filter((e) => matchesSearch(e) && matchesCompanyFilter(e) && matchesDivisionFilter(e))
  const filteredHistory = historyEntries.filter((e) => matchesSearch(e) && matchesCompanyFilter(e) && matchesDivisionFilter(e))

  const pendingTotalPages = Math.ceil(filteredPending.length / itemsPerPage)
  const paginatedPending = filteredPending.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const historyTotalPages = Math.ceil(filteredHistory.length / itemsPerPage)
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const pendingHeaders = [
    "Actions", "Quotation No.",
    ...pendingColumnOptions.filter((opt) => pendingVisibleColumns[opt.key]).map((opt) => opt.label)
  ]

  const renderPendingRow = (entry, index) => (
    <tr key={`${entry.quotationNo}-${index}`} className="hover:bg-slate-50 transition-colors">
      <td className="sticky left-0 z-10 bg-white px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium border-r border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => openPopup(entry)}
            className="px-2 sm:px-3 py-1 text-xs border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md transition-colors whitespace-nowrap"
          >
            Update
          </button>
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{entry.quotationNo}</td>
      {pendingVisibleColumns.leadNo && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{entry.leadNo || "-"}</td>
      )}
      {pendingVisibleColumns.companyName && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
          <div className="max-w-[120px] sm:max-w-[150px] truncate" title={entry.companyName}>{entry.companyName}</div>
        </td>
      )}
      {pendingVisibleColumns.division && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
          <div className="max-w-[100px] sm:max-w-[120px] truncate" title={entry.division}>{entry.division || "-"}</div>
        </td>
      )}
      {pendingVisibleColumns.date && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{entry.date || "-"}</td>
      )}
      {pendingVisibleColumns.freightType && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{entry.freightType || "-"}</td>
      )}
      {pendingVisibleColumns.totalAmount && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
          {Number(entry.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
      )}
      {pendingVisibleColumns.advancePayment && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{entry.advancePayment || "No"}</td>
      )}
      {pendingVisibleColumns.advanceAmount && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{entry.advanceAmount || "-"}</td>
      )}
      {pendingVisibleColumns.status && (
        <td className="px-3 sm:px-4 py-3 sm:py-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${entry.status === "Hold" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"}`}>
            {entry.status === "Hold" ? "On Hold" : "Pending Review"}
          </span>
        </td>
      )}
      {pendingVisibleColumns.quotation && (
        <td className="px-3 sm:px-4 py-3 sm:py-4">
          <button
            onClick={() => handleViewQuotation(entry)}
            className="inline-flex items-center px-2.5 py-1 text-xs border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md whitespace-nowrap"
          >
            <DownloadIcon className="h-3.5 w-3.5 mr-1" /> View Quotation
          </button>
        </td>
      )}
    </tr>
  )

  const renderPendingCard = (entry, index) => (
    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {entry.quotationNo}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${entry.status === "Hold" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"}`}>
              {entry.status === "Hold" ? "On Hold" : "Pending Review"}
            </span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg">{entry.companyName}</h3>
          <p className="text-sm text-gray-600">Lead {entry.leadNo || "-"} • {entry.division || "-"}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500">Total Amount</p>
          <p className="font-medium">{Number(entry.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Advance Payment</p>
          <p className="font-medium">{entry.advancePayment || "No"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Advance Amount</p>
          <p className="font-medium">{entry.advanceAmount || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Freight Type</p>
          <p className="font-medium">{entry.freightType || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Date</p>
          <p className="font-medium">{entry.date || "-"}</p>
        </div>
      </div>
      <div className="pt-2 border-t border-gray-100 flex justify-end">
        <button
          onClick={() => openPopup(entry)}
          className="flex items-center justify-center px-4 py-2 border border-sky-600 rounded-md text-sm font-medium text-sky-600 bg-white hover:bg-sky-50 w-full"
        >
          Update Status
        </button>
      </div>
    </div>
  )

  const historyHeaders = [
    "Quotation No.",
    ...historyColumnOptions.filter((opt) => historyVisibleColumns[opt.key]).map((opt) => opt.label)
  ]

  const formatHistoryDate = (isoString) => {
    if (!isoString) return "-"
    try {
      const date = new Date(isoString)
      return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`
    } catch {
      return "-"
    }
  }

  const renderHistoryRow = (entry, index) => (
    <tr key={`${entry.quotationNo}-${index}`} className="hover:bg-slate-50 transition-colors">
      <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{entry.quotationNo}</td>
      {historyVisibleColumns.updated && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{formatHistoryDate(entry.updatedAt)}</td>
      )}
      {historyVisibleColumns.leadNo && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{entry.leadNo || "-"}</td>
      )}
      {historyVisibleColumns.companyName && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
          <div className="max-w-[120px] sm:max-w-[150px] truncate" title={entry.companyName}>{entry.companyName}</div>
        </td>
      )}
      {historyVisibleColumns.division && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
          <div className="max-w-[100px] sm:max-w-[120px] truncate" title={entry.division}>{entry.division || "-"}</div>
        </td>
      )}
      {historyVisibleColumns.advanceAmount && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{entry.advanceAmount || "-"}</td>
      )}
      {historyVisibleColumns.receivedAdvance && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 whitespace-nowrap">{entry.receivedAdvance || "-"}</td>
      )}
      {historyVisibleColumns.status && (
        <td className="px-3 sm:px-4 py-3 sm:py-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${entry.status === "Sent to Order" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {entry.status}
          </span>
        </td>
      )}
      {historyVisibleColumns.remarks && (
        <td className="px-3 sm:px-4 py-3 sm:py-4 text-sm text-gray-500">
          <div className="max-w-[150px] sm:max-w-[200px] truncate" title={entry.remarks}>{entry.remarks || "-"}</div>
        </td>
      )}
    </tr>
  )

  const renderHistoryCard = (entry, index) => (
    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-semibold text-gray-500">{formatHistoryDate(entry.updatedAt)}</span>
          <h3 className="font-bold text-gray-900">{entry.companyName}</h3>
          <p className="text-xs text-blue-600 font-medium">{entry.quotationNo}</p>
          <p className="text-xs text-gray-500">Lead {entry.leadNo || "-"}</p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${entry.status === "Sent to Order" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {entry.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div>
          <span className="block text-xs text-gray-400">Advance Amount</span>
          <p>{entry.advanceAmount || "-"}</p>
        </div>
        <div>
          <span className="block text-xs text-gray-400">Received Advance</span>
          <p>{entry.receivedAdvance || "-"}</p>
        </div>
        <div className="col-span-2">
          <span className="block text-xs text-gray-400">Remarks</span>
          <p className="truncate">{entry.remarks || "-"}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4">
      {/* Header / Filters */}
      <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:justify-between lg:items-start shrink-0">
        <div className="flex flex-col space-y-3 lg:space-y-0 lg:flex-row lg:space-x-3 lg:items-center">
          <div className="mb-4 sm:mb-0">
            <div className="inline-flex w-full sm:w-auto rounded-md shadow-sm">
              <button
                onClick={() => setActiveTab("pending")}
                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-l-md transition-colors ${activeTab === "pending"
                  ? "bg-sky-100 text-sky-800 border-sky-200"
                  : "bg-white text-slate-700 hover:bg-slate-50 border-gray-300"
                  } border`}
              >
                Pending
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-r-md transition-colors ${activeTab === "history"
                  ? "bg-sky-100 text-sky-800 border-sky-200"
                  : "bg-white text-slate-700 hover:bg-slate-50 border-gray-300"
                  } border border-l-0`}
              >
                History
              </button>
            </div>
          </div>

          {/* Mobile: Stack filters vertically, Desktop: Horizontal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-2 lg:gap-3">
            {(() => {
              const filterSource = activeTab === "pending" ? pendingEntries : historyEntries
              return (
                <>
                  {/* Company Name Filter */}
                  <div className="min-w-0">
                    <select
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                      <option value="all">All Companies</option>
                      {Array.from(new Set(filterSource.map((item) => item.companyName)))
                        .filter(Boolean)
                        .map((company) => (
                          <option key={company} value={company}>{company}</option>
                        ))}
                    </select>
                  </div>

                  {/* Division Filter */}
                  <div className="min-w-0">
                    <select
                      value={divisionFilter}
                      onChange={(e) => setDivisionFilter(e.target.value)}
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                      <option value="all">All Divisions</option>
                      {Array.from(new Set(filterSource.map((item) => item.division)))
                        .filter(Boolean)
                        .map((division) => (
                          <option key={division} value={division}>{division}</option>
                        ))}
                    </select>
                  </div>
                </>
              )
            })()}

            {/* Column Selection Dropdown */}
            {(() => {
              const isPendingTab = activeTab === "pending"
              const activeColumnOptions = isPendingTab ? pendingColumnOptions : historyColumnOptions
              const activeVisibleColumns = isPendingTab ? pendingVisibleColumns : historyVisibleColumns
              const activeColumnToggle = isPendingTab ? handlePendingColumnToggle : handleHistoryColumnToggle
              const activeSelectAll = isPendingTab ? handlePendingSelectAll : handleHistorySelectAll

              return (
                <div className="min-w-0 relative">
                  <button
                    onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                    className="w-full px-2 sm:px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white flex items-center justify-between gap-2"
                  >
                    <span>Select Columns</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${showColumnDropdown ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showColumnDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                      <div className="p-2">
                        <div className="flex items-center p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            id="select-all-adv"
                            checked={Object.values(activeVisibleColumns).every(Boolean)}
                            onChange={activeSelectAll}
                            className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                          />
                          <label htmlFor="select-all-adv" className="ml-2 text-sm font-medium text-gray-900 cursor-pointer">
                            All Columns
                          </label>
                        </div>

                        <hr className="my-2" />

                        {activeColumnOptions.map((option) => (
                          <div key={option.key} className="flex items-center p-2 hover:bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              id={`adv-column-${option.key}`}
                              checked={activeVisibleColumns[option.key]}
                              onChange={() => activeColumnToggle(option.key)}
                              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor={`adv-column-${option.key}`}
                              className="ml-2 text-sm text-gray-700 cursor-pointer flex-1"
                            >
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="relative w-full lg:w-auto lg:min-w-[250px]">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="search"
                placeholder="Search Quotation No. / Company..."
                className="pl-8 w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col pt-1 mt-2 flex-1 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
            <p className="text-slate-500 mt-4">Loading advance payment data...</p>
          </div>
        ) : (
          <>
            {activeTab === "pending" && (
              <div className="flex flex-col flex-1 min-h-0">
                <DataTable
                  headers={pendingHeaders}
                  data={paginatedPending}
                  renderRow={renderPendingRow}
                  renderCard={renderPendingCard}
                  minWidth="1200px"
                  currentPage={currentPage}
                  totalPages={pendingTotalPages}
                  itemsPerPage={itemsPerPage}
                  totalResults={filteredPending.length}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                />
              </div>
            )}

            {activeTab === "history" && (
              <div className="flex flex-col flex-1 min-h-0">
                <DataTable
                  headers={historyHeaders}
                  data={paginatedHistory}
                  renderRow={renderHistoryRow}
                  renderCard={renderHistoryCard}
                  minWidth="1200px"
                  currentPage={currentPage}
                  totalPages={historyTotalPages}
                  itemsPerPage={itemsPerPage}
                  totalResults={filteredHistory.length}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Update Status Popup */}
      {showPopup && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${fadeIn}`}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closePopup}></div>
          <div className={`relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden ${slideIn}`}>
            <div className="border-b p-4 sm:p-6 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 truncate pr-4">
                Advance Payment: {selectedEntry?.quotationNo}
              </h3>
              <button onClick={closePopup} className="text-gray-500 hover:text-gray-700 focus:outline-none p-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500">Company Name</p>
                    <p className="text-sm font-semibold break-words">{selectedEntry?.companyName || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500">Division</p>
                    <p className="text-sm font-semibold break-words">{selectedEntry?.division || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500">Total Amount</p>
                    <p className="text-sm font-semibold break-words">
                      {Number(selectedEntry?.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500">Advance Amount Required</p>
                    <p className="text-sm font-semibold break-words">
                      {selectedEntry?.advanceAmount ? Number(selectedEntry.advanceAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "-"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="receivedAdvance" className="block text-sm font-medium text-gray-700">
                    Received Advance Amount
                  </label>
                  <input
                    id="receivedAdvance"
                    type="number"
                    value={receivedAdvance}
                    onChange={(e) => setReceivedAdvance(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Enter received amount"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="status-sent"
                        name="status"
                        value="Sent to Order"
                        checked={status === "Sent to Order"}
                        onChange={() => setStatus("Sent to Order")}
                        className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                      />
                      <label htmlFor="status-sent" className="text-sm text-gray-700">Sent to Order</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="status-not"
                        name="status"
                        value="Not Sent to Order"
                        checked={status === "Not Sent to Order"}
                        onChange={() => setStatus("Not Sent to Order")}
                        className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                      />
                      <label htmlFor="status-not" className="text-sm text-gray-700">Not Sent to Order</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="status-hold"
                        name="status"
                        value="Hold"
                        checked={status === "Hold"}
                        onChange={() => setStatus("Hold")}
                        className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                      />
                      <label htmlFor="status-hold" className="text-sm text-gray-700">Hold</label>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    "Sent to Order" or "Not Sent to Order" moves this out of Pending into History. "Hold" keeps it in Pending.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">
                    Remarks
                  </label>
                  <textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Enter remarks"
                    rows="3"
                  />
                </div>
              </div>

              <div className="border-t bg-white p-4 sm:p-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <button
                  type="button"
                  onClick={closePopup}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !status}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancePayment
