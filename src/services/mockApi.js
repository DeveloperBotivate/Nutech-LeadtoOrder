
import { users, dropdowns, companies, fmsData, quotations, enquiryTracker, enquiryToOrder, products } from '../data/dummyData';
import {
    getSubmittedLeads, saveSubmittedLead,
    getResolvedLeadNumbers, markLeadResolved,
    getQuotationReadyLeads, saveQuotationReadyLead,
    getFollowUpHistory, addFollowUpHistory,
    getCompanies,
    getAdvancePayments, saveAdvancePayment,
    getSavedQuotations, saveSavedQuotation
} from '../utils/storageManager';

const simulateDelay = () => new Promise(resolve => setTimeout(resolve, 500));

// Helper function to determine priority based on lead source (mirrors the
// badge logic on the Call Tracker page)
const determinePriority = (source) => {
    if (!source) return "Low";
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes("indiamart")) return "High";
    if (sourceLower.includes("website")) return "Medium";
    return "Low";
};

export const mockApi = {
    login: async (username, password) => {
        await simulateDelay();
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            return {
                success: true,
                user: {
                    username: user.username,
                    userType: user.userType,
                    loginTime: new Date().toISOString()
                }
            };
        }
        return { success: false, message: "Invalid credentials" };
    },

    fetchUserData: async (username, userType) => {
        await simulateDelay();
        // In the original app, this returned rows from 'Data' sheet.
        // We'll mimic that by returning fmsData, filtered if necessary.
        // The original app expected raw rows. We should probably return clean objects
        // and update the app to use them. For now, let's return clean objects.
        if (userType === 'admin') {
            return fmsData;
        }
        return fmsData.filter(d => d.assignedUser === username);
    },

    fetchDropdowns: async () => {
        await simulateDelay();
        return dropdowns;
    },

    fetchCompanies: async () => {
        await simulateDelay();
        return companies;
    },

    // Looks up a lead's originally-captured details (by its lead number) so
    // follow-up forms can pre-fill fields like State/NOB instead of asking
    // the user to re-enter them.
    fetchLeadByNumber: async (leadNo) => {
        await simulateDelay();
        if (!leadNo) return { success: false };

        const fmsMatch = fmsData.find(row => row.leadNumber === leadNo);
        if (fmsMatch) {
            return {
                success: true,
                lead: {
                    state: fmsMatch.state || "",
                    nob: fmsMatch.nob || "",
                    city: fmsMatch.city || "",
                    division: fmsMatch.division || "",
                    address: fmsMatch.address || ""
                }
            };
        }

        const submittedMatch = getSubmittedLeads().find(lead => lead.leadNumber === leadNo);
        if (submittedMatch) {
            return {
                success: true,
                lead: {
                    state: submittedMatch.state || "",
                    nob: submittedMatch.nob || "",
                    city: submittedMatch.city || "",
                    division: submittedMatch.division || "",
                    address: submittedMatch.address || ""
                }
            };
        }

        return { success: false };
    },

    submitLead: async (leadData) => {
        await simulateDelay();

        const existingLeads = getSubmittedLeads();
        const leadNumber = `LD-${String(fmsData.length + existingLeads.length + 1).padStart(3, '0')}`;

        const newLead = {
            ...leadData,
            leadNumber,
            timestamp: new Date().toISOString()
        };

        saveSubmittedLead(newLead);

        return { success: true, leadNumber };
    },

    generateLeadNumber: async () => {
        await simulateDelay();
        // Find max lead number
        // sophisticated logic could be here, but "LD-003" is fine for dummy
        return "LD-003";
    },

    // Dashboard Metrics
    fetchDashboardMetrics: async (currentUser, isAdminFunc) => {
        await simulateDelay();

        // Logic adapted from DashboardMetrics.jsx
        const username = currentUser?.username;

        const filterUser = (item) => {
            if (isAdminFunc()) return true;
            return item.assignedUser === username;
        };

        const myFms = fmsData.filter(filterUser);
        const myQuotations = quotations.filter(filterUser);
        const myEnquiries = enquiryTracker.filter(filterUser);
        const myEnquiryToOrder = enquiryToOrder.filter(filterUser);

        return {
            totalLeads: myFms.length.toString(),
            pendingFollowups: myFms.filter(d => d.hasPendingFollowUp).length.toString(),
            quotationsSent: myQuotations.length.toString(),
            ordersReceived: myEnquiries.filter(d => d.orderReceived === "Yes").length.toString(),
            totalEnquiry: myEnquiryToOrder.length.toString(), // Approximated
            pendingEnquiry: myEnquiryToOrder.filter(d => d.status === "Pending").length.toString()
        };
    },

    fetchPendingTasks: async (currentUser, isAdminFunc) => {
        await simulateDelay();
        
        // Use existing fetchFollowUps for data
        const followUpsData = await mockApi.fetchFollowUps(currentUser, isAdminFunc);
        const pending = followUpsData.pending || [];
        
        // Format it for the PendingTasks widget
        return pending.slice(0, 5).map(task => ({
            id: task.id,
            type: "Follow-up",
            company: task.companyName,
            reference: `Lead No: ${task.id}`,
            date: task.nextCallDate || "Today",
            actionText: "Call Now",
            link: `/follow-up`
        }));
    },

    fetchRecentActivities: async (currentUser, isAdminFunc) => {
        await simulateDelay();
        
        const username = currentUser?.username;
        const isAdmin = isAdminFunc();
        const checkPerm = (userAssigned) => isAdmin || (userAssigned === username);
        
        const activities = [];
        
        // 1. New Leads
        getSubmittedLeads().forEach(lead => {
            if (checkPerm(lead.receiverName)) {
                activities.push({
                    user: lead.receiverName || "System",
                    action: "Created a new lead",
                    type: "Lead",
                    detail: lead.companyName || "Unknown",
                    time: lead.timestamp,
                    dateObj: new Date(lead.timestamp || 0)
                });
            }
        });
        
        // 2. Follow-up History (using basic date parse for dd/mm/yyyy if needed)
        getFollowUpHistory().forEach(history => {
            if (checkPerm(history.assignedTo)) {
                let d = new Date();
                if (history.timestamp && history.timestamp.includes('/')) {
                    const parts = history.timestamp.split('/');
                    if (parts.length === 3) d = new Date(parts[2], parts[1]-1, parts[0]);
                }
                activities.push({
                    user: history.assignedTo || "System",
                    action: `Follow-up: ${history.status}`,
                    type: "Follow-up",
                    detail: history.companyName || "Unknown",
                    time: history.timestamp,
                    dateObj: d
                });
            }
        });
        
        // 3. Quotations
        const savedQuots = getSavedQuotations();
        Object.values(savedQuots).forEach(q => {
            if (checkPerm(q.assignedUser || q.preparedBy)) {
                activities.push({
                    user: q.assignedUser || q.preparedBy || "System",
                    action: "Saved quotation",
                    type: "Quotation",
                    detail: q.companyName || q.quotationNo || "Unknown",
                    time: q.savedAt,
                    dateObj: new Date(q.savedAt || 0)
                });
            }
        });

        // Sort by date (desc) and take top 5
        activities.sort((a, b) => b.dateObj - a.dateObj);
        
        return activities.slice(0, 5).map(a => {
            let timeStr = "Recently";
            if (a.dateObj && !isNaN(a.dateObj.getTime())) {
                const diffMs = new Date() - a.dateObj;
                const diffMins = Math.floor(diffMs / 60000);
                if (diffMins < 60) timeStr = `${Math.max(1, diffMins)} min ago`;
                else if (diffMins < 1440) timeStr = `${Math.floor(diffMins/60)} hours ago`;
                else timeStr = `${Math.floor(diffMins/1440)} days ago`;
            }
            return {
                user: a.user,
                action: a.action,
                type: a.type,
                detail: a.detail,
                time: timeStr
            };
        });
    },

    fetchFollowUps: async (currentUser, isAdminFunc) => {
        await simulateDelay();

        // Logic adapted from FollowUp.jsx
        const username = currentUser?.username;

        // Process Pending Follow-ups from fmsData
        // Condition: has column K (index 27 in code, likely followUpDate) and column L (index 28, ??) is empty
        // In our dummy data, we used 'hasPendingFollowUp' flag for simplicity.
        // Let's refine fmsData in dummyData.js or just map it here.

        // We will just use the dummy data as is and add missing fields on the fly if needed
        // or assume dummy data is shaped correctly.

        // Leads whose follow-up already ended in "Order Receive" or "Not
        // Interested" are done — drop them from Pending. "Expected" leaves
        // a lead pending since it still needs a future follow-up.
        const resolvedLeadNumbers = getResolvedLeadNumbers();

        const pendingFollowUps = fmsData.filter(row => {
            // assignedUser check
            const assignedUser = row.assignedUser;
            const shouldInclude = isAdminFunc() || assignedUser === username;
            return shouldInclude && row.hasPendingFollowUp && !resolvedLeadNumbers.includes(row.leadNumber);
        }).map(row => ({
            timestamp: row.date,
            id: row.leadNumber,
            leadId: row.leadNumber,
            companyName: row.company,
            personName: row.personName,
            phoneNumber: row.phoneNumber,
            leadSource: row.source,
            leadType: row.leadType,
            receiverName: row.receiver,
            location: row.location,
            email: row.email,
            state: row.state,
            city: row.city,
            address: row.address,
            gst: row.gst,
            nob: row.nob,
            division: row.division,
            creditAccess: row.creditAccess,
            creditDays: row.creditDays,
            creditLimit: row.creditLimit,
            contactPersons: row.contactPersons || [],
            notes: row.notes,
            customerSay: "Interested",
            enquiryStatus: "New",
            createdAt: row.date,
            nextCallDate: row.followUpDate, // Mapping 'followUpDate' to 'nextCallDate'
            priority: "High",
            assignedTo: row.assignedUser,
            itemQty: ""
        }));

        // Leads submitted via the New Lead form also show up here as
        // pending, until they're followed up on.
        const submittedLeadFollowUps = getSubmittedLeads().filter(lead => {
            const shouldInclude = isAdminFunc() || lead.receiverName === username;
            return shouldInclude && !resolvedLeadNumbers.includes(lead.leadNumber);
        }).map(lead => ({
            timestamp: lead.timestamp,
            id: lead.leadNumber,
            leadId: lead.leadNumber,
            companyName: lead.companyName,
            personName: lead.salespersonName,
            phoneNumber: lead.phoneNumber,
            leadSource: lead.source,
            leadType: lead.leadType,
            receiverName: lead.receiverName,
            location: lead.location,
            email: lead.email,
            state: lead.state,
            city: lead.city,
            address: lead.address,
            gst: lead.gst,
            nob: lead.nob,
            division: lead.division,
            creditAccess: lead.creditAccess,
            creditDays: lead.creditDays,
            creditLimit: lead.creditLimit,
            contactPersons: lead.contactPersons || [],
            notes: lead.notes,
            customerSay: "",
            enquiryStatus: "New",
            createdAt: lead.date,
            nextCallDate: "",
            priority: determinePriority(lead.source),
            assignedTo: lead.receiverName,
            itemQty: ""
        }));

        // History from leadsTracker. We don't have leadsTracker in dummyData yet.
        // Let's create a quick dummy array here or use existing
        const hardcodedHistory = [];

        const storedHistory = getFollowUpHistory();

        const historyFollowUps = [...hardcodedHistory, ...storedHistory].filter(row => {
            const assignedUser = row.assignedTo;
            return isAdminFunc() || assignedUser === username;
        });

        return {
            pending: [...pendingFollowUps, ...submittedLeadFollowUps],
            history: historyFollowUps
        };
    },

    submitFollowUp: async (data) => {
        await simulateDelay();

        const leadNo = data.leadNo;

        if (data.enquiryStatus === "not-interested") {
            // Closed out with no order — drop it from the Pending list.
            markLeadResolved(leadNo);
        } else if (data.enquiryStatus === "yes") {
            // "Order Receive" — drop it from Pending and hand its details
            // over to the Quotation page's Lead No. picker.
            markLeadResolved(leadNo);

            const fmsMatch = fmsData.find(row => row.leadNumber === leadNo);
            const submittedMatch = getSubmittedLeads().find(lead => lead.leadNumber === leadNo);
            const source = fmsMatch || submittedMatch;

            if (source) {
                saveQuotationReadyLead(leadNo, {
                    sheet: "FMS",
                    companyName: source.company || source.companyName || "",
                    // Kept for backward compatibility with older readers; prefer
                    // billingAddress/shippingAddress below for new code.
                    address: data.shippingAddress || source.address || "",
                    billingAddress: data.billingAddress || source.address || "",
                    shippingAddress: data.shippingAddress || source.address || "",
                    state: data.enquiryState || source.state || "",
                    city: data.city || source.city || "",
                    division: data.division || source.division || "",
                    freightType: data.freightType || "",
                    contactName: source.personName || source.salespersonName || "",
                    contactNo: source.phoneNumber || "",
                    gstin: source.gst || "",
                    // Items captured on the Call Tracker "Order Receive" form
                    // ({name, uom, quantity} each) — carried through so the
                    // Quotation page's Items & Quantities table can prefill
                    // from them when this lead is selected.
                    items: Array.isArray(data.items) ? data.items : [],
                    rowData: []
                });
            }
        }
        // "expected" leaves the lead pending — nothing to do here.

        // ADD: Save to History
        const fmsMatch = fmsData.find(row => row.leadNumber === leadNo);
        const submittedMatch = getSubmittedLeads().find(lead => lead.leadNumber === leadNo);
        const source = fmsMatch || submittedMatch;

        const dateObj = new Date();
        const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

        const historyEntry = {
            timestamp: formattedDate,
            leadNo: leadNo,
            companyName: source ? (source.company || source.companyName) : "",
            division: data.division || (source ? (source.division || "") : ""),
            enquiryCity: data.city || (source ? (source.city || "") : ""),
            customerSay: data.customerFeedback || "",
            status: data.enquiryStatus === "expected" ? "Pending" : "Completed",
            enquiryReceivedStatus: data.enquiryStatus === "yes" ? "Order Receive" : data.enquiryStatus === "expected" ? "Expected" : "Not Interested",
            enquiryReceivedDate: (data.rowData && data.rowData.length > 5) ? data.rowData[5] : "",
            enquiryState: data.enquiryState || "",
            projectName: data.nob || "",
            salesType: data.freightType || "",
            requiredProductDate: "", 
            projectApproxValue: "", 
            itemName1: data.items && data.items[0] ? data.items[0].name : "",
            quantity1: data.items && data.items[0] ? data.items[0].quantity : "",
            itemName2: data.items && data.items[1] ? data.items[1].name : "",
            quantity2: data.items && data.items[1] ? data.items[1].quantity : "",
            itemName3: data.items && data.items[2] ? data.items[2].name : "",
            quantity3: data.items && data.items[2] ? data.items[2].quantity : "",
            itemName4: data.items && data.items[3] ? data.items[3].name : "",
            quantity4: data.items && data.items[3] ? data.items[3].quantity : "",
            itemName5: data.items && data.items[4] ? data.items[4].name : "",
            quantity5: data.items && data.items[4] ? data.items[4].quantity : "",
            nextAction: data.nextAction || "",
            nextCallDate: data.nextCallDate || "",
            nextCallTime: data.nextCallTime || "",
            historyDateFilter: `Date(${dateObj.getFullYear()},${dateObj.getMonth()},${dateObj.getDate()})`,
            assignedTo: source ? (source.assignedUser || source.receiverName) : "",
            itemQty: data.items ? JSON.stringify(data.items) : ""
        };

        addFollowUpHistory(historyEntry);

        // Mimic success
        console.log("Mock submit follow up:", data);
        return { success: true };
    },

    uploadFile: async (file) => {
        await simulateDelay();
        return "https://dummy-file-url.com/file";
    },

    fetchDashboardAppCharts: async (currentUser, isAdminFunc) => {
        await simulateDelay();

        const username = currentUser?.username;
        const isAdmin = isAdminFunc();

        // Helper to check permission
        const checkPerm = (row) => isAdmin || (row.assignedUser === username);

        // 1. Lead Data (Monthly)
        const monthlyData = {};

        // Leads from FMS
        fmsData.forEach(row => {
            if (checkPerm(row)) {
                // Assuming date is DD/MM/YYYY
                const parts = row.date.split('/');
                const month = new Date(parts[2], parts[1] - 1, parts[0]).toLocaleString('en-US', { month: 'short' });
                if (!monthlyData[month]) monthlyData[month] = { leads: 0, enquiries: 0, orders: 0 };
                monthlyData[month].leads++;
            }
        });

        // Orders from enquiry data
        enquiryTracker.forEach(row => {
            if (checkPerm(row) && row.orderReceived === "Yes") {
                const parts = row.date.split('/');
                const month = new Date(parts[2], parts[1] - 1, parts[0]).toLocaleString('en-US', { month: 'short' });
                if (!monthlyData[month]) monthlyData[month] = { leads: 0, enquiries: 0, orders: 0 };
                monthlyData[month].orders++;
            }
        });

        const leadData = Object.keys(monthlyData).map(month => ({
            month,
            leads: monthlyData[month].leads,
            enquiries: monthlyData[month].enquiries, // simplified (0 for now)
            orders: monthlyData[month].orders
        }));

        // 2. Conversion Data
        const totalLeads = fmsData.filter(checkPerm).length;
        const totalEnquiries = enquiryTracker.filter(checkPerm).length; // Simplified
        const totalQuotations = quotations.filter(checkPerm).length;
        const totalOrders = enquiryTracker.filter(r => checkPerm(r) && r.orderReceived === "Yes").length;

        const conversionData = [
            { name: "Leads", value: totalLeads, color: "#4f46e5" },
            { name: "Enquiries", value: totalEnquiries, color: "#8b5cf6" },
            { name: "Quotations", value: totalQuotations, color: "#d946ef" },
            { name: "Orders", value: totalOrders, color: "#ec4899" }
        ];

        // 3. Source Data
        const sourceCounter = {};
        fmsData.forEach(row => {
            if (checkPerm(row) && row.source) {
                sourceCounter[row.source] = (sourceCounter[row.source] || 0) + 1;
            }
        });

        const sourceData = Object.keys(sourceCounter).map((name, index) => ({
            name,
            value: sourceCounter[name],
            color: ["#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6"][index % 5]
        }));

        return { leadData, conversionData, sourceData };
    },

    // Quotation specific
    getNextQuotationNumber: async (prefix = "NBD") => {
        await simulateDelay();
        return `${prefix}-2526-003`; // Mock next number
    },

    getCompanyPrefix: async (companyName) => {
        await simulateDelay();
        return "NBD";
    },

    // The Quotation page's Lead No. dropdown is scoped to exactly one
    // source: leads whose Call Tracker follow-up outcome was "Order
    // Receive" (see submitFollowUp -> saveQuotationReadyLead above). This
    // is the "Call Tracker History" data the picker is meant to show.
    // Once a lead already has a saved quotation/PO, it's dropped from the
    // list so the same lead can't be used to create a second PO.
    fetchCallTrackerLeads: async () => {
        await simulateDelay();
        const readyLeads = getQuotationReadyLeads();
        const usedLeadNumbers = new Set(
            Object.values(getSavedQuotations())
                .map(q => q.leadNo)
                .filter(Boolean)
        );
        return Object.entries(readyLeads)
            .filter(([leadNo]) => !usedLeadNumbers.has(leadNo))
            .map(([leadNo, data]) => ({
                leadNo,
                ...data
            }));
    },

    // PO Number auto-generation: NTC/PO/<financial-year>/<sequence>,
    // sequential within the current financial year based on the highest
    // PO number already saved.
    getNextPoNumber: async () => {
        await simulateDelay();

        const now = new Date();
        const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        const fy = `${String(fyStartYear).slice(-2)}-${String(fyStartYear + 1).slice(-2)}`;
        const prefix = `NTC/PO/${fy}/`;

        const saved = Object.values(getSavedQuotations());
        const maxSeq = saved.reduce((max, q) => {
            if (q.poNumber && q.poNumber.startsWith(prefix)) {
                const seq = parseInt(q.poNumber.slice(prefix.length), 10);
                if (!isNaN(seq) && seq > max) return seq;
            }
            return max;
        }, 0);

        return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
    },

    // Real saved quotations (keyed by quotation number) take priority; the
    // static dummy list is only a fallback for the couple of seed rows that
    // predate real persistence.
    fetchExistingQuotations: async (isAdminFunc) => {
        await simulateDelay();
        const savedNumbers = Object.keys(getSavedQuotations());
        const seedNumbers = quotations.map(q => q.quotationNo).filter(no => !savedNumbers.includes(no));
        return [...seedNumbers, ...savedNumbers];
    },

    // Lists every saved quotation (one entry per revision — a Revise saves
    // under a new number rather than overwriting), newest first, for the
    // Quotation page's History tab.
    fetchQuotationHistory: async () => {
        await simulateDelay();
        const saved = Object.values(getSavedQuotations());
        return saved.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
    },

    getQuotationData: async (quotationNo) => {
        await simulateDelay();
        const saved = getSavedQuotations()[quotationNo];
        if (saved) {
            return { success: true, quotationData: saved };
        }
        const quote = quotations.find(q => q.quotationNo === quotationNo);
        if (quote) {
            return { success: true, quotationData: quote };
        }
        return { success: false, error: "Quotation not found" };
    },

    saveQuotation: async (data, action = "save") => {
        await simulateDelay();
        console.log(`Mock ${action} quotation:`, data);

        // A real "Save Quotation" (not the "Send"/link-share action) persists
        // the full quotation — so it shows up in the History tab and can be
        // reloaded for Revise/Preview — and registers or refreshes this
        // quotation's Received Advance against PI tracking entry. Its
        // resolution status/remarks are preserved across re-saves (e.g.
        // revisions) rather than being wiped back to "pending".
        if (action === "save" && data.quotationNo) {
            saveSavedQuotation(data.quotationNo, {
                ...data,
                savedAt: new Date().toISOString()
            });

            const existing = getAdvancePayments()[data.quotationNo] || {};
            saveAdvancePayment(data.quotationNo, {
                quotationNo: data.quotationNo,
                poNumber: data.poNumber || data.quotationNo,
                leadNo: data.leadNo || "",
                companyName: data.consigneeName || "",
                division: data.consigneeDivision || "",
                city: data.consigneeCity || "",
                contactName: data.consigneeContactName || "",
                contactNo: data.consigneeContactNo || "",
                date: data.date || "",
                freightType: data.freightType || "",
                advancePayment: data.advancePayment || "No",
                advanceAmount: data.advanceAmount || "",
                receivedAdvance: existing.receivedAdvance || "",
                status: existing.status || "",
                remarks: existing.remarks || ""
            });
        }

        return { success: true, quotationNumber: data.quotationNo || "NTC-NEW-001" };
    },

    fetchProducts: async () => {
        await simulateDelay();
        return products;
    },

    fetchQuotationDropdowns: async () => {
        await simulateDelay();
        // Construct the complex object expected by Quotation.jsx
        // This maps dummyData structures to the expected format
        const response = {
            states: {},
            companies: {},
            references: {},
            preparedBy: users.map(u => u.username)
        };

        // Populate companies
        companies.forEach(comp => {
            response.companies[comp.name] = {
                address: comp.location, // simplified mapping
                state: comp.consignorState,
                contactName: comp.salesPerson,
                contactNo: comp.phoneNumber,
                gstin: "27AA...",
                stateCode: "27"
            };
        });

        // Overlay Company Master data — City and Division live there, so
        // companies managed on the Master page enrich (or add to) the
        // dropdown with those fields.
        getCompanies().forEach(comp => {
            response.companies[comp.name] = {
                ...(response.companies[comp.name] || {}),
                address: comp.address || response.companies[comp.name]?.address || "",
                state: comp.state || response.companies[comp.name]?.state || "",
                contactName: comp.contactPersons?.[0]?.name || response.companies[comp.name]?.contactName || "",
                contactNo: comp.phone || response.companies[comp.name]?.contactNo || "",
                gstin: comp.gst || response.companies[comp.name]?.gstin || "",
                stateCode: response.companies[comp.name]?.stateCode || "27",
                city: comp.city || "",
                division: comp.division || ""
            };
        });

        // Add Quotation Ready Leads to companies dropdown
        const readyLeads = getQuotationReadyLeads();
        Object.values(readyLeads).forEach(lead => {
            if (lead.companyName) {
                response.companies[lead.companyName] = {
                    address: lead.address || "",
                    state: lead.state || "",
                    contactName: lead.contactName || "",
                    contactNo: lead.contactNo || "",
                    gstin: lead.gstin || "",
                    stateCode: "27", // Default/simplified mapping
                    city: lead.city || "",
                    division: lead.division || ""
                };
            }
        });

        // Populate states (using generic data for now as dummyData.dropdowns.states is just a list)
        dropdowns.states.forEach(state => {
            response.states[state] = {
                bankDetails: "Account No: 1234567890\nBank Name: HDFC\nIFSC: HDFC0001234",
                consignerAddress: `Address in ${state}`,
                stateCode: "10",
                gstin: "10AAA...",
                pan: "ABC...",
                msmeNumber: "MSME..."
            };
        });
        // Populate references
        dropdowns.receivers.forEach(ref => {
            response.references[ref] = {
                mobile: "9999999999"
            };
        });

        return response;
    },

    fetchLeadNumbers: async () => {
        await simulateDelay();

        const leadNumbers = {};

        // Mock FMS leads
        fmsData.forEach(row => {
            // Simulate filtering: has pending follow up (mocking the BA/BB check)
            if (row.hasPendingFollowUp) {
                leadNumbers[row.leadNumber] = {
                    sheet: "FMS",
                    companyName: row.company,
                    address: "Mock Address FMS",
                    state: "Maharashtra",
                    contactName: row.receiver,
                    contactNo: "9876543210",
                    gstin: "27ABC...",
                    rowData: [] // simplified
                };
            }
        });

        // Mock Enquiry Leads
        enquiryToOrder.forEach(row => {
            if (row.status === "Pending") {
                leadNumbers[row.enquiryNo] = {
                    sheet: "ENQUIRY",
                    companyName: "Mock Company Enquiry",
                    address: "Mock Address Enquiry",
                    state: "Delhi",
                    contactName: row.assignedUser,
                    contactNo: "8765432109",
                    gstin: "07XYZ...",
                    rowData: [] // simplified
                };
            }
        });

        // Leads marked "Order Receive" on the Call Tracker follow-up form —
        // real company/contact details captured during the lead's lifecycle,
        // overriding the placeholder FMS/Enquiry entries above where they overlap.
        Object.assign(leadNumbers, getQuotationReadyLeads());

        return leadNumbers;
    },

    // Received Advance against PI — one tracking entry per saved quotation
    // (created by saveQuotation above). "Hold" (or no status yet) keeps an
    // entry in Pending; "Sent to Order" / "Not Sent to Order" resolves it
    // into History.
    fetchAdvancePayments: async () => {
        await simulateDelay();

        const savedQuotations = getSavedQuotations();
        // Join in the quotation's stored PDF (a data: URI) so Pending/History
        // rows here can offer a "View PDF" action without duplicating the
        // PDF data into the advance-payment entry itself.
        const entries = Object.values(getAdvancePayments()).map(entry => ({
            ...entry,
            pdfUrl: savedQuotations[entry.quotationNo]?.pdfUrl || ""
        }));

        const pending = entries.filter(e => !e.status || e.status === "Hold");
        const history = entries.filter(e => e.status === "Sent to Order" || e.status === "Not Sent to Order");

        // Newest first
        return {
            pending: pending.slice().reverse(),
            history: history.slice().reverse()
        };
    },

    submitAdvancePaymentUpdate: async (quotationNo, updateData) => {
        await simulateDelay();

        if (!quotationNo) {
            return { success: false, error: "Missing quotation number" };
        }

        saveAdvancePayment(quotationNo, {
            ...updateData,
            updatedAt: new Date().toISOString()
        });

        return { success: true };
    }
};
