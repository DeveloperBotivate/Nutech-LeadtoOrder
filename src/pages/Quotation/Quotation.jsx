"use client"

import { useState, useEffect, useContext, useMemo } from "react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { AuthContext } from "../../App"
import { mockApi } from "../../services/mockApi"
import { getTermsAndConditions } from "../../utils/storageManager"
import DataTable from "../../components/DataTable"
import { PlusIcon, TrashIcon, DownloadIcon, SaveIcon, EyeIcon, RefreshCwIcon, SearchIcon } from "../../components/Icons"
import nutechLogo from "../../assests/Nutechlogo.png"

const FIRM_NAME = "Nutech"
const FIRM_ADDRESS = "Swarnabhoomi, C-131, R-5, Vidhan Sabha Road, Raipur, Chattisgarh, India, Raipur, Chattisgarh 493111, IN"
const GST_SLABS = [0, 5, 12, 18, 28]
const cardClass = "bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
const labelClass = "block text-sm font-medium text-gray-700 mb-1"
const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
const readOnlyInputClass = "w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-600"

const todayISO = () => new Date().toISOString().split("T")[0]

const formatDisplayDate = (isoDate) => {
  if (!isoDate) return "-"
  const parts = isoDate.split("-")
  if (parts.length !== 3) return isoDate
  const [year, month, day] = parts
  return `${day}/${month}/${year}`
}

// Terms & Conditions are pulled straight from the Master list, as-is —
// however many entries an admin has configured there — with no term-name
// label shown on the Quotation page, only the description text itself.
const loadTermsFromMaster = () => getTermsAndConditions().map((t) => ({
  id: t.id,
  description: t.description || "",
}))

// Accepts either the current array shape or an older saved quotation's
// {validity, paymentTerms, ...} object shape, and returns plain description
// strings either way.
const normalizeTermDescriptions = (terms) => {
  if (Array.isArray(terms)) {
    return terms.map((t) => (typeof t === "string" ? t : t.description || "")).filter(Boolean)
  }
  if (terms && typeof terms === "object") {
    return Object.values(terms).filter(Boolean)
  }
  return []
}

const computeItemTotal = (qty, rate, gst) => {
  const base = Number(qty || 0) * Number(rate || 0)
  const gstAmount = base * (Number(gst || 0) / 100)
  return Number((base + gstAmount).toFixed(2))
}

const makeEmptyItem = (id) => ({
  id,
  item: "",
  qty: 1,
  rate: 0,
  hsn: "",
  gst: 18,
  deliveryDate: "",
  total: 0,
})

const makeInitialFormData = () => ({
  leadNo: "",
  companyName: "",
  division: "",
  poNumber: "",
  poDate: todayISO(),
  billingAddress: "",
  shippingAddress: "",
  state: "",
  city: "",
  contactName: "",
  contactNo: "",
  gst: "",
  quotationDate: todayISO(),
  freightType: "",
  advancePayment: "No",
  advanceAmount: "",
})

// Builds the quotation PDF from a flat data object shaped like the
// Send PO payload (see handleSendPo) — reused for both the initial save and
// regenerating a PDF for an already-saved History record.
const buildQuotationPdf = (data) => {
  const doc = new jsPDF("p", "mm", "a4")
  const pageWidth = 210
  const margin = 12
  let y = 16

  // Firm Header (Centered)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.setTextColor(14, 116, 144) // matches a sky/cyan theme, or just black
  doc.text(data.firmName || FIRM_NAME, pageWidth / 2, y, { align: "center" })
  y += 6
  
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  const addressLines = doc.splitTextToSize(FIRM_ADDRESS, pageWidth - margin * 2)
  addressLines.forEach(line => {
    doc.text(line, pageWidth / 2, y, { align: "center" })
    y += 4
  })
  y += 4

  // Divider
  doc.setDrawColor(220)
  doc.line(margin, y, pageWidth - margin, y)
  y += 6

  // Quotation Title
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(50, 50, 50)
  doc.text("QUOTATION", pageWidth / 2, y, { align: "center", renderingMode: "fill" })
  y += 8

  // Meta Info
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 0, 0)
  doc.text(`PO Number: ${data.poNumber || "-"}`, margin, y)
  doc.text(`PO Date: ${formatDisplayDate(data.poDate)}`, pageWidth - margin, y, { align: "right" })
  y += 5
  doc.text(`Lead No.: ${data.leadNo || "-"}`, margin, y)
  doc.text(`Quotation Date: ${formatDisplayDate(data.quotationDate)}`, pageWidth - margin, y, { align: "right" })
  y += 8

  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 7

  doc.setFont("helvetica", "bold")
  doc.text("Company Details", margin, y)
  y += 5
  doc.setFont("helvetica", "normal")
  const companyLines = [
    `Company: ${data.companyName || "-"}`,
    `Division: ${data.division || "-"}`,
    `State: ${data.state || "-"}    City: ${data.city || "-"}`,
    `Contact: ${data.contactName || "-"} (${data.contactNo || "-"})`,
    `GST: ${data.gst || "-"}`,
    `Freight Payment: ${data.freightType || "-"}`,
  ]
  companyLines.forEach((line) => {
    doc.text(line, margin, y)
    y += 5
  })
  y += 3

  const halfWidth = (pageWidth - margin * 2) / 2 - 4
  doc.setFont("helvetica", "bold")
  doc.text("Billing Address", margin, y)
  doc.text("Shipping Address", margin + halfWidth + 8, y)
  y += 5
  doc.setFont("helvetica", "normal")
  const billingLines = doc.splitTextToSize(data.billingAddress || "-", halfWidth)
  const shippingLines = doc.splitTextToSize(data.shippingAddress || "-", halfWidth)
  billingLines.forEach((line, i) => doc.text(line, margin, y + i * 5))
  shippingLines.forEach((line, i) => doc.text(line, margin + halfWidth + 8, y + i * 5))
  y += Math.max(billingLines.length, shippingLines.length) * 5 + 6

  const itemRows = (data.items || []).map((item, index) => [
    index + 1,
    item.item,
    item.qty,
    Number(item.rate || 0).toFixed(2),
    item.hsn || "-",
    `${item.gst}%`,
    item.deliveryDate ? formatDisplayDate(item.deliveryDate) : "-",
    Number(item.total || 0).toFixed(2),
  ])

  autoTable(doc, {
    startY: y,
    head: [["S/N", "Item", "Qty", "Rate", "HSN", "GST%", "Delivery Date", "Total"]],
    body: itemRows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [14, 116, 144], textColor: 255, fontStyle: "bold" },
    margin: { left: margin, right: margin },
  })

  y = doc.lastAutoTable.finalY + 8
  doc.setFont("helvetica", "bold")
  doc.text(`Grand Total: ${Number(data.grandTotal || 0).toFixed(2)}`, pageWidth - margin, y, { align: "right" })
  y += 8

  doc.setFont("helvetica", "normal")
  doc.text(
    `Advance Payment: ${data.advancePayment || "No"}${data.advancePayment === "Yes" ? `  (Amount: ${data.advanceAmount || 0})` : ""}`,
    margin,
    y
  )
  y += 8

  if (y > 250) {
    doc.addPage()
    y = 16
  }

  doc.setFont("helvetica", "bold")
  doc.text("Terms & Conditions", margin, y)
  y += 5
  doc.setFont("helvetica", "normal")
  normalizeTermDescriptions(data.terms).forEach((description) => {
    const wrapped = doc.splitTextToSize(`• ${description}`, pageWidth - margin * 2)
    wrapped.forEach((line) => {
      if (y > 285) {
        doc.addPage()
        y = 16
      }
      doc.text(line, margin, y)
      y += 5
    })
  })

  return doc
}

function Quotation() {
  const { showNotification } = useContext(AuthContext)

  const [activeTab, setActiveTab] = useState("create")

  const [callTrackerLeads, setCallTrackerLeads] = useState([])
  const [isLoadingLeads, setIsLoadingLeads] = useState(true)
  const [productNames, setProductNames] = useState([])

  const [formData, setFormData] = useState(makeInitialFormData())
  const [items, setItems] = useState([makeEmptyItem(1)])
  const [terms, setTerms] = useState(loadTermsFromMaster())

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const [historyList, setHistoryList] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [historySearch, setHistorySearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  const loadLeads = async () => {
    setIsLoadingLeads(true)
    try {
      const leads = await mockApi.fetchCallTrackerLeads()
      setCallTrackerLeads(leads)
    } catch (error) {
      console.error("Error fetching Call Tracker leads:", error)
      setCallTrackerLeads([])
    } finally {
      setIsLoadingLeads(false)
    }
  }

  const loadNextPoNumber = async () => {
    try {
      const poNumber = await mockApi.getNextPoNumber()
      setFormData((prev) => ({ ...prev, poNumber }))
    } catch (error) {
      console.error("Error fetching next PO number:", error)
    }
  }

  const loadHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const history = await mockApi.fetchQuotationHistory()
      setHistoryList(history)
    } catch (error) {
      console.error("Error fetching quotation history:", error)
      setHistoryList([])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    loadLeads()
    loadNextPoNumber()
    loadHistory()

    mockApi.fetchProducts().then((products) => {
      setProductNames((products || []).map((p) => p.name).filter(Boolean))
    }).catch(() => setProductNames([]))
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [historySearch])

  // Lead No. selection: this is the sole prefill source — Company Name,
  // Division, Billing/Shipping Address, State, City, Contact Name,
  // Contact No., GST, Freight Payment, and the Items & Quantities table all
  // come from the lead's Call Tracker "Order Receive" record.
  const handleLeadChange = (e) => {
    const leadNo = e.target.value
    const lead = callTrackerLeads.find((l) => l.leadNo === leadNo)

    if (!lead) {
      setFormData((prev) => ({
        ...makeInitialFormData(),
        poNumber: prev.poNumber,
        poDate: prev.poDate,
        quotationDate: prev.quotationDate,
      }))
      setItems([makeEmptyItem(1)])
      return
    }

    setFormData((prev) => ({
      ...prev,
      leadNo,
      companyName: lead.companyName || "",
      division: lead.division || "",
      billingAddress: lead.billingAddress || lead.address || "",
      shippingAddress: lead.shippingAddress || lead.address || "",
      state: lead.state || "",
      city: lead.city || "",
      contactName: lead.contactName || "",
      contactNo: lead.contactNo || "",
      gst: lead.gstin || "",
      freightType: lead.freightType || "",
    }))

    // Carry over the items entered on the Call Tracker "Order Receive" form
    // ({name, uom, quantity} each) — rate/HSN/GST%/delivery date weren't
    // captured there, so those start blank/default for the user to fill in.
    if (Array.isArray(lead.items) && lead.items.length > 0) {
      setItems(
        lead.items.map((leadItem, index) => {
          const qty = Number(leadItem.quantity) || 1
          const gst = 18
          return {
            id: index + 1,
            item: leadItem.name || "",
            qty,
            rate: 0,
            hsn: "",
            gst,
            deliveryDate: "",
            total: computeItemTotal(qty, 0, gst),
          }
        })
      )
    } else {
      setItems([makeEmptyItem(1)])
    }
  }

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleTermChange = (id, value) => {
    setTerms((prev) => prev.map((t) => (t.id === id ? { ...t, description: value } : t)))
  }

  // ---- Items & Quantities ----
  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        if (field === "qty" || field === "rate" || field === "gst") {
          updated.total = computeItemTotal(updated.qty, updated.rate, updated.gst)
        }
        return updated
      })
    )
  }

  const addItem = () => {
    setItems((prev) => [...prev, makeEmptyItem(Math.max(0, ...prev.map((i) => i.id)) + 1)])
  }

  const removeItem = (id) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev))
  }

  const grandTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.total || 0), 0),
    [items]
  )

  const handleReset = () => {
    setFormData(makeInitialFormData())
    setItems([makeEmptyItem(1)])
    setTerms(loadTermsFromMaster())
    loadNextPoNumber()
  }

  const validate = () => {
    if (!formData.leadNo) return "Please select a Lead No."
    if (!formData.companyName) return "Company Name is missing for the selected lead."
    const validItems = items.filter((i) => i.item.trim() && Number(i.qty) > 0)
    if (validItems.length === 0) return "Please add at least one item with a quantity."
    if (formData.advancePayment === "Yes" && !(Number(formData.advanceAmount) > 0)) {
      return "Please enter the advance amount."
    }
    return null
  }

  const buildPayload = () => ({
    ...formData,
    firmName: FIRM_NAME,
    quotationNo: formData.poNumber, // keeps this record keyed the same way the rest of the app (Advance Payment/History) expects
    items,
    terms,
    grandTotal,
    // Mirrors of the consignee-prefixed fields other pages already read
    consigneeName: formData.companyName,
    consigneeDivision: formData.division,
    consigneeCity: formData.city,
    consigneeState: formData.state,
    consigneeContactName: formData.contactName,
    consigneeContactNo: formData.contactNo,
    consigneeGSTIN: formData.gst,
    date: formData.quotationDate,
  })

  const handleGeneratePdf = (record) => {
    try {
      if (record.pdfDataUri) {
        const link = document.createElement("a")
        link.href = record.pdfDataUri
        link.download = `Quotation_${(record.poNumber || record.quotationNo || "quotation").replace(/\//g, "-")}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }
      const doc = buildQuotationPdf(record)
      doc.save(`Quotation_${(record.poNumber || record.quotationNo || "quotation").replace(/\//g, "-")}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      showNotification("Failed to generate PDF", "error")
    }
  }

  const handleSendPo = async () => {
    const validationError = validate()
    if (validationError) {
      showNotification(validationError, "error")
      return
    }

    setIsSubmitting(true)
    try {
      const payload = buildPayload()
      const doc = buildQuotationPdf(payload)
      const pdfDataUri = doc.output("datauristring")

      // The mock upload endpoint always returns a placeholder URL — the real
      // PDF is kept as a data URI on the saved record itself so History's
      // "Generate PDF" works without depending on it.
      await mockApi.uploadFile(
        { name: `Quotation_${formData.poNumber}.pdf`, type: "application/pdf" },
        "pdf"
      )

      const result = await mockApi.saveQuotation({ ...payload, pdfDataUri })

      if (!result.success) {
        throw new Error(result.error || "Unknown error while saving")
      }

      showNotification(`Quotation ${formData.poNumber} saved successfully`, "success")
      handleReset()
      await Promise.all([loadHistory(), loadLeads()]) // refresh so this lead drops out of the Lead No. picker
      setActiveTab("history")
    } catch (error) {
      console.error("Error saving quotation:", error)
      showNotification("Error saving quotation: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredHistory = historyList.filter((record) => {
    if (!historySearch) return true
    const q = historySearch.toLowerCase()
    return (
      (record.poNumber && record.poNumber.toLowerCase().includes(q)) ||
      (record.quotationNo && record.quotationNo.toLowerCase().includes(q)) ||
      (record.leadNo && record.leadNo.toLowerCase().includes(q)) ||
      (record.companyName && record.companyName.toLowerCase().includes(q))
    )
  })

  const historyTotalPages = Math.ceil(filteredHistory.length / itemsPerPage)
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const historyHeaders = [
    "PO Number", "Lead No.", "Company Name", "Division", "PO Date",
    "Quotation Date", "Advance Payment", "Grand Total", "Actions"
  ]

  const renderHistoryRow = (record, index) => (
    <tr key={`${record.poNumber || record.quotationNo}-${index}`} className="hover:bg-slate-50 transition-colors">
      <td className="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{record.poNumber || record.quotationNo}</td>
      <td className="px-3 sm:px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{record.leadNo || "-"}</td>
      <td className="px-3 sm:px-4 py-3 text-sm text-gray-500">
        <div className="max-w-[140px] truncate" title={record.companyName}>{record.companyName || "-"}</div>
      </td>
      <td className="px-3 sm:px-4 py-3 text-sm text-gray-500">{record.division || "-"}</td>
      <td className="px-3 sm:px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDisplayDate(record.poDate)}</td>
      <td className="px-3 sm:px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDisplayDate(record.quotationDate)}</td>
      <td className="px-3 sm:px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
        {record.advancePayment === "Yes" ? `Yes (${record.advanceAmount || 0})` : "No"}
      </td>
      <td className="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
        {Number(record.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </td>
      <td className="px-3 sm:px-4 py-3">
        <button
          onClick={() => handleGeneratePdf(record)}
          className="inline-flex items-center px-2.5 py-1 text-xs border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md whitespace-nowrap"
        >
          <DownloadIcon className="h-3.5 w-3.5 mr-1" /> Generate PDF
        </button>
      </td>
    </tr>
  )

  const renderHistoryCard = (record, index) => (
    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
            {record.poNumber || record.quotationNo}
          </span>
          <h3 className="font-bold text-gray-900 mt-1">{record.companyName || "-"}</h3>
          <p className="text-xs text-gray-500">Lead {record.leadNo || "-"} • {record.division || "-"}</p>
        </div>
        <span className="text-sm font-semibold text-gray-900">
          {Number(record.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div><span className="block text-xs text-gray-400">PO Date</span>{formatDisplayDate(record.poDate)}</div>
        <div><span className="block text-xs text-gray-400">Quotation Date</span>{formatDisplayDate(record.quotationDate)}</div>
        <div className="col-span-2">
          <span className="block text-xs text-gray-400">Advance Payment</span>
          {record.advancePayment === "Yes" ? `Yes (${record.advanceAmount || 0})` : "No"}
        </div>
      </div>
      <button
        onClick={() => handleGeneratePdf(record)}
        className="w-full flex items-center justify-center px-4 py-2 border border-sky-600 rounded-md text-sm font-medium text-sky-600 bg-white hover:bg-sky-50"
      >
        <DownloadIcon className="h-4 w-4 mr-2" /> Generate PDF
      </button>
    </div>
  )

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 shrink-0">
        <button
          onClick={() => setActiveTab("create")}
          className={`flex-1 sm:flex-none px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === "create"
            ? "text-indigo-600 border-indigo-600 bg-indigo-50/60"
            : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
        >
          Create Quotation
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 sm:flex-none px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === "history"
            ? "text-indigo-600 border-indigo-600 bg-indigo-50/60"
            : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
        >
          History
        </button>
      </div>

      {/* Firm Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm shrink-0 overflow-hidden">
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <img src={nutechLogo} alt={FIRM_NAME} className="h-14 w-auto object-contain" />
          <p className="text-sm text-gray-500">{FIRM_ADDRESS}</p>
        </div>
        <div className="border-t border-gray-100 py-3 text-center">
          <p className="text-sm font-bold tracking-[0.3em] text-gray-800 uppercase">Quotation</p>
        </div>
      </div>

      {activeTab === "create" ? (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pb-2">
          {/* Firm & Lead */}
          <div className={cardClass}>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Firm & Lead Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Firm Name</label>
                <input type="text" value={FIRM_NAME} readOnly className={readOnlyInputClass} />
              </div>
              <div>
                <label className={labelClass}>Lead No. <span className="text-red-500">*</span></label>
                <select value={formData.leadNo} onChange={handleLeadChange} className={inputClass}>
                  <option value="">
                    {isLoadingLeads ? "Loading leads..." : "Select Lead No."}
                  </option>
                  {callTrackerLeads.map((lead) => (
                    <option key={lead.leadNo} value={lead.leadNo}>
                      {lead.leadNo} — {lead.companyName || "Unnamed"}
                    </option>
                  ))}
                </select>
                {!isLoadingLeads && callTrackerLeads.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No leads yet — mark a Call Tracker follow-up as "Order Receive" first.
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Company Name</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleFieldChange("companyName", e.target.value)}
                  className={inputClass}
                  placeholder="Auto-fills from Lead No."
                />
              </div>
              <div>
                <label className={labelClass}>Division</label>
                <input
                  type="text"
                  value={formData.division}
                  onChange={(e) => handleFieldChange("division", e.target.value)}
                  className={inputClass}
                  placeholder="Auto-fills from Lead No."
                />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleFieldChange("state", e.target.value)}
                  className={inputClass}
                  placeholder="Auto-fills from Lead No."
                />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleFieldChange("city", e.target.value)}
                  className={inputClass}
                  placeholder="Auto-fills from Lead No."
                />
              </div>
              <div>
                <label className={labelClass}>Contact Name</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => handleFieldChange("contactName", e.target.value)}
                  className={inputClass}
                  placeholder="Auto-fills from Lead No."
                />
              </div>
              <div>
                <label className={labelClass}>Contact No.</label>
                <input
                  type="text"
                  value={formData.contactNo}
                  onChange={(e) => handleFieldChange("contactNo", e.target.value)}
                  className={inputClass}
                  placeholder="Auto-fills from Lead No."
                />
              </div>
              <div>
                <label className={labelClass}>GST</label>
                <input
                  type="text"
                  value={formData.gst}
                  onChange={(e) => handleFieldChange("gst", e.target.value)}
                  className={inputClass}
                  placeholder="Auto-fills from Lead No."
                />
              </div>
              <div>
                <label className={labelClass}>Freight Payment</label>
                <input
                  type="text"
                  value={formData.freightType}
                  onChange={(e) => handleFieldChange("freightType", e.target.value)}
                  className={inputClass}
                  placeholder="Auto-fills from Lead No."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={labelClass}>Billing Address</label>
                <textarea
                  value={formData.billingAddress}
                  onChange={(e) => handleFieldChange("billingAddress", e.target.value)}
                  className={inputClass}
                  rows={3}
                  placeholder="Auto-fills from Lead No."
                />
              </div>
              <div>
                <label className={labelClass}>Shipping Address</label>
                <textarea
                  value={formData.shippingAddress}
                  onChange={(e) => handleFieldChange("shippingAddress", e.target.value)}
                  className={inputClass}
                  rows={3}
                  placeholder="Auto-fills from Lead No."
                />
              </div>
            </div>
          </div>

          {/* PO / Quotation Details */}
          <div className={cardClass}>
            <h3 className="text-base font-semibold text-gray-900 mb-4">PO & Quotation Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>PO Number</label>
                <input type="text" value={formData.poNumber || "Generating..."} readOnly className={readOnlyInputClass} />
              </div>
              <div>
                <label className={labelClass}>PO Date</label>
                <input
                  type="date"
                  value={formData.poDate}
                  onChange={(e) => handleFieldChange("poDate", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Quotation Date</label>
                <input
                  type="date"
                  value={formData.quotationDate}
                  onChange={(e) => handleFieldChange("quotationDate", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className={labelClass}>Advance Payment</label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="advancePayment"
                    checked={formData.advancePayment === "Yes"}
                    onChange={() => handleFieldChange("advancePayment", "Yes")}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700">Yes</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="advancePayment"
                    checked={formData.advancePayment === "No"}
                    onChange={() => handleFieldChange("advancePayment", "No")}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700">No</span>
                </label>
                {formData.advancePayment === "Yes" && (
                  <div className="flex-1 max-w-xs">
                    <input
                      type="number"
                      min="0"
                      value={formData.advanceAmount}
                      onChange={(e) => handleFieldChange("advanceAmount", e.target.value)}
                      className={inputClass}
                      placeholder="Advance Amount"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items & Quantities */}
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Items & Quantities</h3>
              <button
                onClick={addItem}
                className="inline-flex items-center px-3 py-1.5 text-xs border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md"
              >
                <PlusIcon className="h-3.5 w-3.5 mr-1" /> Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: "900px" }}>
                <thead className="bg-gray-50">
                  <tr>
                    {["S/N", "Item", "Qty", "Rate", "HSN", "GST%", "Delivery Date", "Total", ""].map((h) => (
                      <th key={h} className="px-2 py-2 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-2 py-2 text-gray-500">{index + 1}</td>
                      <td className="px-2 py-2 min-w-[180px]">
                        <input
                          list="item-suggestions"
                          type="text"
                          value={item.item}
                          onChange={(e) => handleItemChange(item.id, "item", e.target.value)}
                          className={inputClass}
                          placeholder="Item name"
                        />
                      </td>
                      <td className="px-2 py-2 w-20">
                        <input
                          type="number"
                          min="0"
                          value={item.qty}
                          onChange={(e) => handleItemChange(item.id, "qty", e.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-2 w-28">
                        <input
                          type="number"
                          min="0"
                          value={item.rate}
                          onChange={(e) => handleItemChange(item.id, "rate", e.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-2 w-28">
                        <input
                          type="text"
                          value={item.hsn}
                          onChange={(e) => handleItemChange(item.id, "hsn", e.target.value)}
                          className={inputClass}
                          placeholder="HSN"
                        />
                      </td>
                      <td className="px-2 py-2 w-24">
                        <select
                          value={item.gst}
                          onChange={(e) => handleItemChange(item.id, "gst", e.target.value)}
                          className={inputClass}
                        >
                          {GST_SLABS.map((slab) => (
                            <option key={slab} value={slab}>{slab}%</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 w-40">
                        <input
                          type="date"
                          value={item.deliveryDate}
                          onChange={(e) => handleItemChange(item.id, "deliveryDate", e.target.value)}
                          className={inputClass}
                        />
                      </td>
                      <td className="px-2 py-2 w-28 text-right font-medium text-gray-900 whitespace-nowrap">
                        {Number(item.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                          className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="item-suggestions">
                {productNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <div className="text-right">
                <span className="text-sm text-gray-500 mr-3">Grand Total:</span>
                <span className="text-lg font-bold text-gray-900">
                  {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className={cardClass}>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Terms & Conditions</h3>
            <div className="space-y-3">
              {terms.length === 0 ? (
                <p className="text-sm text-gray-400">No terms configured in Master yet.</p>
              ) : (
                terms.map((t) => (
                  <input
                    key={t.id}
                    type="text"
                    value={t.description}
                    onChange={(e) => handleTermChange(t.id, e.target.value)}
                    className={inputClass}
                  />
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pb-2">
            <button
              onClick={handleReset}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" /> Reset
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-sky-300 text-sky-700 rounded-md hover:bg-sky-50"
            >
              <EyeIcon className="h-4 w-4 mr-2" /> Preview
            </button>
            <button
              onClick={handleSendPo}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center px-5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium rounded-md disabled:opacity-50"
            >
              <SaveIcon className="h-4 w-4 mr-2" /> {isSubmitting ? "Saving..." : "Send PO"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 space-y-3">
          <div className="relative w-full sm:w-80 shrink-0">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="search"
              placeholder="Search PO No. / Lead No. / Company..."
              className="pl-8 w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
            />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
            {isLoadingHistory ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                <p className="text-slate-500 mt-4">Loading quotation history...</p>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPreview(false)}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b p-4 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Quotation Preview</h3>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-700 p-1">✕</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5 text-sm">
              <div className="flex justify-between">
                <div>
                  <p className="text-lg font-bold">{FIRM_NAME}</p>
                  <p className="text-gray-500">Lead No.: {formData.leadNo || "-"}</p>
                </div>
                <div className="text-right">
                  <p><span className="text-gray-500">PO Number:</span> <span className="font-medium">{formData.poNumber}</span></p>
                  <p><span className="text-gray-500">PO Date:</span> {formatDisplayDate(formData.poDate)}</p>
                  <p><span className="text-gray-500">Quotation Date:</span> {formatDisplayDate(formData.quotationDate)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <p className="font-semibold mb-1">Company Details</p>
                  <p>{formData.companyName || "-"} ({formData.division || "-"})</p>
                  <p>{formData.city || "-"}, {formData.state || "-"}</p>
                  <p>{formData.contactName || "-"} — {formData.contactNo || "-"}</p>
                  <p>GST: {formData.gst || "-"}</p>
                  <p>Freight Payment: {formData.freightType || "-"}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Billing Address</p>
                  <p className="whitespace-pre-wrap">{formData.billingAddress || "-"}</p>
                  <p className="font-semibold mt-2 mb-1">Shipping Address</p>
                  <p className="whitespace-pre-wrap">{formData.shippingAddress || "-"}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-semibold mb-2">Items & Quantities</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {["S/N", "Item", "Qty", "Rate", "HSN", "GST%", "Delivery Date", "Total"].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left border-b border-gray-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="px-2 py-1.5">{index + 1}</td>
                          <td className="px-2 py-1.5">{item.item || "-"}</td>
                          <td className="px-2 py-1.5">{item.qty}</td>
                          <td className="px-2 py-1.5">{Number(item.rate || 0).toFixed(2)}</td>
                          <td className="px-2 py-1.5">{item.hsn || "-"}</td>
                          <td className="px-2 py-1.5">{item.gst}%</td>
                          <td className="px-2 py-1.5">{formatDisplayDate(item.deliveryDate)}</td>
                          <td className="px-2 py-1.5 text-right">{Number(item.total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-right font-bold mt-2">
                  Grand Total: {grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-semibold mb-1">
                  Advance Payment: {formData.advancePayment}
                  {formData.advancePayment === "Yes" && ` (Amount: ${formData.advanceAmount || 0})`}
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="font-semibold mb-2">Terms & Conditions</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {terms.map((t) => (
                    <li key={t.id}>{t.description || "-"}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="border-t p-4 flex justify-end shrink-0">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Quotation
