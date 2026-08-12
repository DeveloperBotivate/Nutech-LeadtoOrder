// Simple localStorage-backed persistence for the Master data module.
// Every master list lives here so other parts of the app (e.g. the New
// Lead form's dropdowns) can read the same data the Master pages edit.

const KEYS = {
  COMPANIES: "master_companies",
  UOMS: "master_uoms",
  LEAD_RECEIVER_NAMES: "master_lead_receiver_names",
  LEAD_SOURCES: "master_lead_sources",
  NOBS: "master_nobs",
  CREDIT_DAYS: "master_credit_days",
  CREDIT_LIMITS: "master_credit_limits",
  SUBMITTED_LEADS: "submitted_leads",
  RESOLVED_LEADS: "resolved_lead_numbers",
  QUOTATION_READY_LEADS: "quotation_ready_leads",
  FOLLOW_UP_HISTORY: "follow_up_history",
  ADVANCE_PAYMENTS: "advance_payment_entries",
  TERMS_AND_CONDITIONS: "master_terms_and_conditions",
  SAVED_QUOTATIONS: "saved_quotations",
};

function readList(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error(`Error reading "${key}" from storage:`, error);
    return null;
  }
}

function writeList(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing "${key}" to storage:`, error);
  }
}

const seedCompanies = () => ([
  {
    id: "seed-company-1",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    vnNo: "CN-001",
    name: "ABC Corp",
    gst: "27ABCDE1234F1Z5",
    email: "contact@abccorp.com",
    phone: "9876543210",
    address: "123, Industrial Area, Mumbai",
    state: "Maharashtra",
    city: "Mumbai",
    nob: "Manufacturing",
    division: "Sales",
    contactPersons: [{ name: "Shadab", designation: "Manager", number: "9876543210" }],
    proof: ""
  },
  {
    id: "seed-company-2",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    vnNo: "CN-002",
    name: "XYZ Pvt Ltd",
    gst: "07VWXYZ1234F1Z5",
    email: "info@xyz.com",
    phone: "8765432109",
    address: "456, Okhla Phase 3, Delhi",
    state: "Delhi",
    city: "Delhi",
    nob: "Trading",
    division: "Operations",
    contactPersons: [{ name: "Sajit", designation: "Director", number: "8765432109" }],
    proof: ""
  }
]);

// The Quotation form's Terms & Conditions section has six fixed fields.
// Each maps to one "term" entry here so admins can edit the standard
// wording from the Master page instead of it being hardcoded in the app.
const TERM_FIELD_MAP = {
  "Validity": "validity",
  "Payment Terms": "paymentTerms",
  "Delivery": "delivery",
  "Freight": "freight",
  "Insurance": "insurance",
  "Taxes": "taxes",
};

const seedTermsAndConditions = () => ([
  { id: "seed-tnc-1", timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), tncNo: "TNC-001", term: "Validity", description: "The above quoted prices are valid up to 5 days from date of offer." },
  { id: "seed-tnc-2", timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), tncNo: "TNC-002", term: "Payment Terms", description: "100% advance payment in the mode of NEFT, RTGS & DD" },
  { id: "seed-tnc-3", timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), tncNo: "TNC-003", term: "Delivery", description: "Material is ready in our stock" },
  { id: "seed-tnc-4", timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), tncNo: "TNC-004", term: "Freight", description: "Extra as per actual." },
  { id: "seed-tnc-5", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), tncNo: "TNC-005", term: "Insurance", description: "Transit insurance for all shipment is at Buyer's risk." },
  { id: "seed-tnc-6", timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), tncNo: "TNC-006", term: "Taxes", description: "Extra as per actual." },
]);

const seedUOMs = () => ([
  { id: "seed-uom-1", timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), uomNo: "UOM-001", name: "PCS" },
  { id: "seed-uom-2", timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), uomNo: "UOM-002", name: "KG" },
  { id: "seed-uom-3", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), uomNo: "UOM-003", name: "METER" },
]);

// ---------------- Companies ----------------

export function getCompanies() {
  const existing = readList(KEYS.COMPANIES);
  if (existing !== null) return existing;

  const seeded = seedCompanies();
  writeList(KEYS.COMPANIES, seeded);
  return seeded;
}

export function saveCompanies(companies) {
  writeList(KEYS.COMPANIES, companies);
}

export function saveCompany(company) {
  const companies = readList(KEYS.COMPANIES) || [];
  writeList(KEYS.COMPANIES, [...companies, company]);
}

// ---------------- Terms & Conditions ----------------

export function getTermsAndConditions() {
  const existing = readList(KEYS.TERMS_AND_CONDITIONS);
  if (existing !== null) return existing;

  const seeded = seedTermsAndConditions();
  writeList(KEYS.TERMS_AND_CONDITIONS, seeded);
  return seeded;
}

export function saveTermsAndConditions(list) {
  writeList(KEYS.TERMS_AND_CONDITIONS, list);
}

// Derives the Quotation form's default text for its six fixed Terms &
// Conditions fields from whatever's currently saved in the Master list.
// A term with no matching entry (e.g. deleted by an admin) defaults to "".
export function getTermsAndConditionsDefaults() {
  const list = getTermsAndConditions();
  const defaults = { validity: "", paymentTerms: "", delivery: "", freight: "", insurance: "", taxes: "" };

  list.forEach(item => {
    const fieldKey = TERM_FIELD_MAP[item.term];
    if (fieldKey) defaults[fieldKey] = item.description || "";
  });

  return defaults;
}

// ---------------- UOMs ----------------

export function getUOMs() {
  const existing = readList(KEYS.UOMS);
  if (existing !== null) return existing;

  const seeded = seedUOMs();
  writeList(KEYS.UOMS, seeded);
  return seeded;
}

export function saveUOMs(uoms) {
  writeList(KEYS.UOMS, uoms);
}

export function saveUOM(uom) {
  const uoms = readList(KEYS.UOMS) || [];
  writeList(KEYS.UOMS, [...uoms, uom]);
}

// ---------------- Simple name-list masters ----------------
// (Lead Receiver Name, Lead Source, NOB, Credit Days, Credit Limit all
// share the same { id, timestamp, <prefix>No, name } shape.)

function createNameListStore(key, prefix, seedNames) {
  const noField = `${prefix}No`;

  const seed = () => seedNames.map((name, index) => ({
    id: `seed-${prefix}-${index + 1}`,
    timestamp: new Date(Date.now() - (seedNames.length - index) * 60 * 60 * 1000).toISOString(),
    [noField]: `${prefix.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
    name
  }));

  return {
    get: () => {
      const existing = readList(key);
      if (existing !== null) return existing;

      const seeded = seed();
      writeList(key, seeded);
      return seeded;
    },
    save: (list) => writeList(key, list),
  };
}

const leadReceiverNameStore = createNameListStore(
  KEYS.LEAD_RECEIVER_NAMES, "lrn", ["Rajesh Kumar", "Priya Sharma", "Sneha Gupta"]
);
const leadSourceStore = createNameListStore(
  KEYS.LEAD_SOURCES, "ls", ["Website", "Referral", "Trade Show", "Direct Mail"]
);
const nobStore = createNameListStore(
  KEYS.NOBS, "nob", ["Manufacturing", "Trading", "Service", "Retail", "OEM"]
);
const creditDaysStore = createNameListStore(
  KEYS.CREDIT_DAYS, "cd", ["15 Days", "30 Days", "45 Days", "60 Days"]
);
const creditLimitStore = createNameListStore(
  KEYS.CREDIT_LIMITS, "cl", ["50,000", "1,00,000", "2,50,000", "5,00,000"]
);

// ---------------- Lead Receiver Names ----------------

export const getLeadReceiverNames = leadReceiverNameStore.get;
export const saveLeadReceiverNames = leadReceiverNameStore.save;

// ---------------- Lead Sources ----------------

export const getLeadSources = leadSourceStore.get;
export const saveLeadSources = leadSourceStore.save;

// ---------------- NOB (Nature of Business) ----------------

export const getNOBs = nobStore.get;
export const saveNOBs = nobStore.save;

// ---------------- Credit Days ----------------

export const getCreditDays = creditDaysStore.get;
export const saveCreditDays = creditDaysStore.save;

// ---------------- Credit Limits ----------------

export const getCreditLimits = creditLimitStore.get;
export const saveCreditLimits = creditLimitStore.save;

// ---------------- Submitted Leads ----------------
// Leads submitted via the New Lead form. These feed the Call Tracker's
// Pending list, so this isn't seeded with sample data — it starts empty,
// and whatever gets filled in on the New Lead form is what shows up there.

export function getSubmittedLeads() {
  return readList(KEYS.SUBMITTED_LEADS) || [];
}

export function saveSubmittedLeads(leads) {
  writeList(KEYS.SUBMITTED_LEADS, leads);
}

export function saveSubmittedLead(lead) {
  const leads = readList(KEYS.SUBMITTED_LEADS) || [];
  writeList(KEYS.SUBMITTED_LEADS, [...leads, lead]);
}

// ---------------- Resolved Leads ----------------
// Lead numbers whose Call Tracker follow-up ended in a final outcome
// ("Order Receive" or "Not Interested"). These are filtered out of the
// Pending list — "Expected" leaves a lead pending since it still needs a
// future follow-up.

export function getResolvedLeadNumbers() {
  return readList(KEYS.RESOLVED_LEADS) || [];
}

export function markLeadResolved(leadNumber) {
  if (!leadNumber) return;
  const resolved = getResolvedLeadNumbers();
  if (!resolved.includes(leadNumber)) {
    writeList(KEYS.RESOLVED_LEADS, [...resolved, leadNumber]);
  }
}

// ---------------- Quotation-ready Leads ----------------
// Leads whose follow-up outcome was "Order Receive". Keyed by lead number,
// in the same shape mockApi.fetchLeadNumbers() already uses, so they show
// up (and pre-fill correctly) in the Quotation page's Lead No. picker.

export function getQuotationReadyLeads() {
  return readList(KEYS.QUOTATION_READY_LEADS) || {};
}

export function saveQuotationReadyLead(leadNumber, leadData) {
  if (!leadNumber) return;
  const existing = getQuotationReadyLeads();
  writeList(KEYS.QUOTATION_READY_LEADS, { ...existing, [leadNumber]: leadData });
}

// ---------------- Follow Up History ----------------

export function getFollowUpHistory() {
  return readList(KEYS.FOLLOW_UP_HISTORY) || [];
}

export function addFollowUpHistory(entry) {
  if (!entry) return;
  const history = getFollowUpHistory();
  writeList(KEYS.FOLLOW_UP_HISTORY, [...history, entry]);
}

// ---------------- Advance Payments (Received Advance against PI) ----------------
// One entry per quotation, keyed by quotation number. Created when a
// quotation is saved, then updated in place as its advance-payment status
// changes — "Hold" leaves it in Pending, "Sent to Order"/"Not Sent to
// Order" resolves it into History.

export function getAdvancePayments() {
  return readList(KEYS.ADVANCE_PAYMENTS) || {};
}

export function saveAdvancePayment(quotationNo, data) {
  if (!quotationNo) return;
  const existing = getAdvancePayments();
  writeList(KEYS.ADVANCE_PAYMENTS, {
    ...existing,
    [quotationNo]: { ...existing[quotationNo], ...data }
  });
}

// ---------------- Saved Quotations ----------------
// Every "Save Quotation" (Create or Revise) writes its full form data here,
// keyed by quotation number — a Revise never overwrites the original, it
// saves under a new incremented number (see Quotation.jsx), so every past
// revision keeps its own entry and stays visible in the Quotation page's
// History tab.

export function getSavedQuotations() {
  return readList(KEYS.SAVED_QUOTATIONS) || {};
}

export function saveSavedQuotation(quotationNo, data) {
  if (!quotationNo) return;
  const existing = getSavedQuotations();
  writeList(KEYS.SAVED_QUOTATIONS, {
    ...existing,
    [quotationNo]: { ...existing[quotationNo], ...data }
  });
}
