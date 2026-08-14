"use client"

import { useState, useContext, useEffect } from "react"
import { useNavigate, useSearchParams, useLocation } from "react-router-dom"
import { AuthContext } from "../App"
import { mockApi } from "../services/mockApi"
import { getUOMs, getCreditDays, getCreditLimits } from "../utils/storageManager"

function NewFollowUp() {
  const navigate = useNavigate()
  const location = useLocation()
  const companyContext = location.state?.companyContext
  const [searchParams] = useSearchParams()
  const leadId = searchParams.get("leadId")
  const leadNo = searchParams.get("leadNo")
  const { currentUser, showNotification } = useContext(AuthContext)
  const [customerFeedbackOptions, setCustomerFeedbackOptions] = useState([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [enquiryStatus, setEnquiryStatus] = useState("")
  const [items, setItems] = useState([{ id: "1", name: "", uom: "", quantity: "" }])
  const [formData, setFormData] = useState({
    leadNo: "",
    nextAction: "",
    nextCallDate: "",
    nextCallTime: "",
    customerFeedback: "",
    interaction: "",
    billingAddress: "",
    shippingAddress: "",
    freightType: "",
    gst: "",
    creditAccess: "",
    creditDays: "",
    creditLimit: "",
  })

  // Pre-filled from the lead's original details once fetched
  const [enquiryState, setEnquiryState] = useState("")
  const [nob, setNob] = useState("")
  const [city, setCity] = useState("")
  const [division, setDivision] = useState("")
  const [leadAttachment, setLeadAttachment] = useState("")

  // New state for dropdown options
  const [productCategories, setProductCategories] = useState([]) // New state for product categories
  const [nobOptions, setNobOptions] = useState([])
  const [uomOptions, setUomOptions] = useState([])
  const [creditDaysOptions, setCreditDaysOptions] = useState([])
  const [creditLimitOptions, setCreditLimitOptions] = useState([])

  // Function to fetch dropdown data from DROPDOWNSHEET
  // Function to fetch dropdown data from DROPDOWNSHEET
  // Function to fetch dropdown data from DROPDOWNSHEET
  const fetchDropdownData = async () => {
    try {
      const data = await mockApi.fetchDropdowns()

      if (data) {
        // Using some default mappings for other dropdowns as they might not be in the initial simplified mockApi response
        // In a real scenario, mockApi.fetchDropdowns should return all these.
        setProductCategories(["Product 1", "Product 2", "Product 3"])
        setNobOptions(data.nobs || [])
        setCustomerFeedbackOptions(["Interested", "Not Interested", "Asked for Quotation", "Callback Later"])
      }
    } catch (error) {
      console.error("Error fetching dropdown values:", error)
      // Fallback values
      setProductCategories(["Product 1", "Product 2", "Product 3"])
      setNobOptions(["NOB 1", "NOB 2", "NOB 3"])
    }

    // UOM, Credit Days & Credit Limit are managed from the Master module
    try {
      setUomOptions(getUOMs().map(item => item.name))
      setCreditDaysOptions(getCreditDays().map(item => item.name))
      setCreditLimitOptions(getCreditLimits().map(item => item.name))
    } catch (error) {
      console.error("Error loading master dropdown data:", error)
    }
  }

  useEffect(() => {
    // Fetch dropdown data when component mounts
    fetchDropdownData()

    if (companyContext) {
      // Pre-fill fields from the company context (Enquiry flow)
      if (companyContext.state) setEnquiryState(companyContext.state)
      if (companyContext.nob) setNob(companyContext.nob)
      if (companyContext.city) setCity(companyContext.city)
      if (companyContext.division) setDivision(companyContext.division)
      setFormData((prevData) => ({
        ...prevData,
        leadNo: "Auto-generated on Save",
      }))
    } else if (leadNo) {
      // Prepopulate lead number if available
      setFormData((prevData) => ({
        ...prevData,
        leadNo: leadNo,
      }))

      // Pre-fill Enquiry for State / NOB / City / Division from the lead's original details
      mockApi.fetchLeadByNumber(leadNo).then((result) => {
        if (result.success && result.lead) {
          if (result.lead.state) setEnquiryState(result.lead.state)
          if (result.lead.nob) setNob(result.lead.nob)
          if (result.lead.city) setCity(result.lead.city)
          if (result.lead.division) setDivision(result.lead.division)
          if (result.lead.attachment) setLeadAttachment(result.lead.attachment)
        }
      }).catch((error) => {
        console.error("Error fetching lead details for pre-fill:", error)
      })
    }
  }, [leadNo])

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [id]: value,
    }))
  }

  // The combined "Next Call Date & Time" input splits back into the
  // separate nextCallDate/nextCallTime fields the rest of the form (and the
  // saved history record) already uses.
  const handleNextCallDateTimeChange = (e) => {
    const [date, time] = e.target.value.split("T")
    setFormData((prevData) => ({
      ...prevData,
      nextCallDate: date || "",
      nextCallTime: time || "",
    }))
  }

  const calculateTotalQuantity = () => {
    return items.reduce((total, item) => {
      const quantity = parseInt(item.quantity) || 0
      return total + quantity
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let finalLeadNo = formData.leadNo;

      if (companyContext && finalLeadNo === "Auto-generated on Save") {
        const leadResult = await mockApi.createEnquiryLead(companyContext, currentUser?.username);
        if (leadResult.success) {
           finalLeadNo = leadResult.leadNumber;
        } else {
           throw new Error("Failed to create enquiry lead.");
        }
      }

      const currentDate = new Date()
      const formattedDate = formatDate(currentDate)

      // Prepare base row data (columns A-E)
      const rowData = [
        formattedDate, // A: Current date
        finalLeadNo, // B: Lead Number
        formData.customerFeedback, // C: Customer feedback
        "", // D: (Lead Status removed)
        enquiryStatus, // E: Enquiry Status
      ]

      // Handle different scenarios
      if (enquiryStatus === "expected") {
        // Explicitly add columns F-K as empty (6 empty columns)
        rowData.push("", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "")

        // Then add columns V, W, X
        rowData.push(
          formData.nextAction, // V: Next action
          formData.nextCallDate, // W: Next call date
          formData.nextCallTime, // X: Next call time
        )
      }
      else if (enquiryStatus === "yes") {
        // Add columns F-K
        rowData.push(
          formattedDate, // F: Enquiry Received Date (Order Received Date field removed — uses today's date)
          enquiryState, // G: Enquiry for State
          nob, // H: Project Name (NOB)
          "", // I: (Enquiry Type removed)
          "", // J: (Enquiry Approach removed)
          "", // K: Project Value (empty)
        )

        // Handle first 5 items (columns L-U)
        const first5Items = items.slice(0, 5)

        // Add first 5 items in pairs (name, quantity)
        first5Items.forEach((item) => {
          rowData.push(item.name || "") // Product category
          rowData.push(item.quantity || "0") // Quantity (0 if null/empty)
        })

        // If less than 5 items, fill remaining slots with empty values
        const remainingSlots = 5 - first5Items.length
        for (let i = 0; i < remainingSlots; i++) {
          rowData.push("", "0") // Empty name and 0 quantity
        }

        // Pad to reach column AB (index 27)
        while (rowData.length < 27) {
          rowData.push("")
        }

        // Column AB (index 27): (Leads Tracking Status removed)
        rowData.push("")

        // Handle items 6 and onwards as JSON in column AC (index 28)
        if (items.length > 5) {
          const additionalItems = items.slice(5).map(item => ({
            name: item.name || "",
            quantity: item.quantity || "0"
          }))
          rowData.push(JSON.stringify(additionalItems)) // Column AC
        } else {
          rowData.push("") // Empty if no additional items
        }

        // Add total quantity in column AD (index 29)
        rowData.push(calculateTotalQuantity().toString())

      } else if (enquiryStatus === "not-interested") {
        // Pad columns F-K and then V-X with empty values
        rowData.push("", "", "", "", "", "", "", "", "")
      }

      console.log("Row Data to be submitted:", rowData)

      // Send the data
      const result = await mockApi.submitFollowUp({
        ...formData,
        leadNo: finalLeadNo,
        enquiryStatus,
        enquiryState,
        nob,
        city,
        division,
        items,
        rowData // Keeping raw rowData for structure if needed by mockApi later, or better yet pass structured data
      })

      if (result.success) {
        showNotification("Follow-up recorded successfully", "success")
        navigate("/follow-up")
      } else {
        showNotification("Error recording follow-up: " + (result.error || "Unknown error"), "error")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      showNotification("Error submitting form: " + error.message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Function to format date as dd/mm/yyyy
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const addItem = () => {
    // Define maximum number of items allowed
    const MAX_ITEMS = 300

    // Only add a new item if we haven't reached the maximum
    if (items.length < MAX_ITEMS) {
      const newId = (items.length + 1).toString()
      setItems([...items, { id: newId, name: "", uom: "", quantity: "" }])
    }
  }

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id, field, value) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Lead Follow-Up</h2>
          <p className="text-sm text-slate-500">
            Record details of the follow-up call
            {leadId && <span className="font-medium"> for Lead #{leadId}</span>}
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label htmlFor="leadNo" className="block text-sm font-medium text-gray-700">
                Lead No.
              </label>
              <input
                id="leadNo"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 ${formData.leadNo === "Auto-generated on Save" ? "bg-gray-100 text-gray-500" : ""}`}
                placeholder="LD-001"
                value={formData.leadNo}
                onChange={handleChange}
                required
                readOnly={formData.leadNo === "Auto-generated on Save"}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Attachment (from Lead)</label>
              {leadAttachment ? (
                <a
                  href={leadAttachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md text-sm font-medium transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  View Attachment
                </a>
              ) : (
                <p className="text-sm text-gray-400">No attachment on file for this lead.</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="customerFeedback" className="block text-sm font-medium text-gray-700">
                What did the customer say?
              </label>
              <input
                list="customer-feedback-options"
                id="customerFeedback"
                value={formData.customerFeedback}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Select or type customer feedback"
                required
              />
              <datalist id="customer-feedback-options">
                {customerFeedbackOptions.map((feedback, index) => (
                  <option key={index} value={feedback} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <label htmlFor="interaction" className="block text-sm font-medium text-gray-700">
                Interaction
              </label>
              <select
                id="interaction"
                value={formData.interaction}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select interaction type</option>
                <option value="Call">Call</option>
                <option value="WP">WP</option>
                <option value="Visit">Visit</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Enquiry Received Status</label>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="yes"
                    name="enquiryStatus"
                    value="yes"
                    checked={enquiryStatus === "yes"}
                    onChange={() => setEnquiryStatus("yes")}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="yes" className="text-sm text-gray-700">
                    Order Receive
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="expected"
                    name="enquiryStatus"
                    value="expected"
                    checked={enquiryStatus === "expected"}
                    onChange={() => setEnquiryStatus("expected")}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="expected" className="text-sm text-gray-700">
                    Expected
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="not-interested"
                    name="enquiryStatus"
                    value="not-interested"
                    checked={enquiryStatus === "not-interested"}
                    onChange={() => setEnquiryStatus("not-interested")}
                    className="h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="not-interested" className="text-sm text-gray-700">
                    Not Interested
                  </label>
                </div>
              </div>
            </div>

            {enquiryStatus === "expected" && (
              <div className="space-y-4 border p-4 rounded-md">
                <div className="space-y-2">
                  <label htmlFor="nextAction" className="block text-sm font-medium text-gray-700">
                    Next Action
                  </label>
                  <input
                    id="nextAction"
                    value={formData.nextAction}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Enter next action"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="nextCallDateTime" className="block text-sm font-medium text-gray-700">
                    Next Call Date & Time
                  </label>
                  <input
                    id="nextCallDateTime"
                    type="datetime-local"
                    value={formData.nextCallDate && formData.nextCallTime ? `${formData.nextCallDate}T${formData.nextCallTime}` : ""}
                    onChange={handleNextCallDateTimeChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>
            )}

            {enquiryStatus === "yes" && (
              <div className="space-y-6 border p-4 rounded-md">
                <h3 className="text-lg font-medium">Order Details</h3>
                <hr className="border-gray-200" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">
                      NOB
                    </label>
                    <select
                      id="projectName"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={nob}
                      onChange={(e) => setNob(e.target.value)}
                      required
                    >
                      <option value="">Select NOB</option>
                      {nobOptions.map((nobOption, index) => (
                        <option key={index} value={nobOption}>
                          {nobOption}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="freightType" className="block text-sm font-medium text-gray-700">
                      Freight Type
                    </label>
                    <select
                      id="freightType"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={formData.freightType}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select freight type</option>
                      <option value="FOR">FOR</option>
                      <option value="Ex-Factory">Ex-Factory</option>
                      <option value="Ex-Factory at Transport Office">Ex-Factory at Transport Office</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      id="city"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City will auto-fill"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="division" className="block text-sm font-medium text-gray-700">
                      Division
                    </label>
                    <input
                      id="division"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      placeholder="Division will auto-fill"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="gst" className="block text-sm font-medium text-gray-700">
                      GST Number
                    </label>
                    <input
                      id="gst"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={formData.gst}
                      onChange={handleChange}
                      placeholder="GST number"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="creditAccess" className="block text-sm font-medium text-gray-700">
                      Credit Access
                    </label>
                    <select
                      id="creditAccess"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={formData.creditAccess}
                      onChange={handleChange}
                    >
                      <option value="">Select option</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="creditDays" className="block text-sm font-medium text-gray-700">
                      Credit Days
                    </label>
                    <select
                      id="creditDays"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={formData.creditDays}
                      onChange={handleChange}
                    >
                      <option value="">Select credit days</option>
                      {creditDaysOptions.map((option, index) => (
                        <option key={index} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="creditLimit" className="block text-sm font-medium text-gray-700">
                      Credit Limit
                    </label>
                    <select
                      id="creditLimit"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={formData.creditLimit}
                      onChange={handleChange}
                    >
                      <option value="">Select credit limit</option>
                      {creditLimitOptions.map((option, index) => (
                        <option key={index} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  {/* <div className="space-y-2">
                    <label htmlFor="requiredDate" className="block text-sm font-medium text-gray-700">
                      Required Product Date
                    </label>
                    <input
                      id="requiredDate"
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="projectValue" className="block text-sm font-medium text-gray-700">
                      Project Approximate Value
                    </label>
                    <input
                      id="projectValue"
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="Enter value"
                      required
                    />
                  </div> */}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="billingAddress" className="block text-sm font-medium text-gray-700">
                      Billing Address
                    </label>
                    <textarea
                      id="billingAddress"
                      value={formData.billingAddress}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="Enter billing address"
                      rows="2"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700">
                      Shipping Address
                    </label>
                    <textarea
                      id="shippingAddress"
                      value={formData.shippingAddress}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="Enter shipping address"
                      rows="2"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Items</h4>
                    <button
                      type="button"
                      onClick={addItem}
                      className="px-3 py-1 text-xs border border-sky-200 text-sky-600 hover:bg-sky-50 rounded-md"
                      disabled={items.length >= 300}
                    >
                      + Add Item ({items.length}/300)
                    </button>
                  </div>

                  {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="md:col-span-4 space-y-2">
                        <label htmlFor={`itemName-${item.id}`} className="block text-sm font-medium text-gray-700">
                          Item Name {index + 1}
                        </label>
                        <input
                          list={`item-options-${item.id}`}
                          id={`itemName-${item.id}`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, "name", e.target.value)}
                          required
                          placeholder="Select or type item name"
                        />
                        <datalist id={`item-options-${item.id}`}>
                          {productCategories.map((category, index) => (
                            <option key={index} value={category} />
                          ))}
                        </datalist>
                      </div>

                      <div className="md:col-span-3 space-y-2">
                        <label htmlFor={`uom-${item.id}`} className="block text-sm font-medium text-gray-700">
                          UOM
                        </label>
                        <select
                          id={`uom-${item.id}`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                          value={item.uom}
                          onChange={(e) => updateItem(item.id, "uom", e.target.value)}
                          required
                        >
                          <option value="">Select UOM</option>
                          {uomOptions.map((uom, index) => (
                            <option key={index} value={uom}>
                              {uom}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-3 space-y-2">
                        <label htmlFor={`quantity-${item.id}`} className="block text-sm font-medium text-gray-700">
                          Quantity
                        </label>
                        <input
                          id={`quantity-${item.id}`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                          placeholder="Enter quantity"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                          className="p-2 text-slate-500 hover:text-slate-700 disabled:opacity-50"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="p-6 border-t flex justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
            >
              {isSubmitting ? "Saving..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewFollowUp
