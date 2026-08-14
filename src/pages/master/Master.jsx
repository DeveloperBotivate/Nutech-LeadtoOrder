import React, { useState } from 'react';
import {
  Search, Plus, Filter,
  Building2, Ruler, Users, Share2, Briefcase, CalendarClock, Wallet, FileText
} from 'lucide-react';
import Company from './Company';
import UOM from './UOM';
import LeadReceiverName from './LeadReceiverName';
import LeadSource from './LeadSource';
import NOB from './NOB';
import CreditDays from './CreditDays';
import CreditLimit from './CreditLimit';
import TermsAndConditions from './TermsAndConditions';
import SearchableDropdown from '../../components/SearchableDropdown';
import {
  getCompanies, getUOMs, getLeadReceiverNames, getLeadSources,
  getNOBs, getCreditDays, getCreditLimits, getTermsAndConditions
} from '../../utils/storageManager';

// Each master type's sidebar entry — icon, label, and a live count pulled
// straight from storage (all these getters are cheap sync localStorage
// reads, so recomputing on every render is fine).
const MASTER_TYPES = [
  { key: 'Company', label: 'Company', icon: Building2, getCount: () => getCompanies().length },
  { key: 'UOM', label: 'UOM', icon: Ruler, getCount: () => getUOMs().length },
  { key: 'Sales Person Name', label: 'Sales Person Name', icon: Users, getCount: () => getLeadReceiverNames().length },
  { key: 'Lead Source', label: 'Lead Source', icon: Share2, getCount: () => getLeadSources().length },
  { key: 'NOB', label: 'NOB', icon: Briefcase, getCount: () => getNOBs().length },
  { key: 'Credit Days', label: 'Credit Days', icon: CalendarClock, getCount: () => getCreditDays().length },
  { key: 'Credit Limit', label: 'Credit Limit', icon: Wallet, getCount: () => getCreditLimits().length },
  { key: 'Terms and Conditions', label: 'Terms & Conditions', icon: FileText, getCount: () => getTermsAndConditions().length },
];

export default function Master() {
  const [activeTab, setActiveTab] = useState('Company');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Triggers to open Add Modal in child components
  const [triggerAddCompany, setTriggerAddCompany] = useState(0);
  const [triggerAddUOM, setTriggerAddUOM] = useState(0);
  const [triggerAddLRN, setTriggerAddLRN] = useState(0);
  const [triggerAddLS, setTriggerAddLS] = useState(0);
  const [triggerAddNOB, setTriggerAddNOB] = useState(0);
  const [triggerAddCD, setTriggerAddCD] = useState(0);
  const [triggerAddCL, setTriggerAddCL] = useState(0);
  const [triggerAddTNC, setTriggerAddTNC] = useState(0);

  const handleAddClick = () => {
    if (activeTab === 'Company') setTriggerAddCompany(prev => prev + 1);
    else if (activeTab === 'UOM') setTriggerAddUOM(prev => prev + 1);
    else if (activeTab === 'Sales Person Name') setTriggerAddLRN(prev => prev + 1);
    else if (activeTab === 'Lead Source') setTriggerAddLS(prev => prev + 1);
    else if (activeTab === 'NOB') setTriggerAddNOB(prev => prev + 1);
    else if (activeTab === 'Credit Days') setTriggerAddCD(prev => prev + 1);
    else if (activeTab === 'Credit Limit') setTriggerAddCL(prev => prev + 1);
    else if (activeTab === 'Terms and Conditions') setTriggerAddTNC(prev => prev + 1);
  };

  const selectTab = (key) => {
    setActiveTab(key);
    setSearchQuery('');
    setShowMobileFilters(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-150px)] min-h-0 min-w-0">
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 flex-1 min-h-0 min-w-0">

        {/* Master Data sub-sidebar — desktop only */}
        <div className="hidden lg:flex lg:flex-col w-60 flex-shrink-0 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Master Data</span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {MASTER_TYPES.map(({ key, label, icon: Icon, getCount }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => selectTab(key)}
                  className={`w-full flex items-center justify-between gap-2 pl-4 pr-3 py-2.5 text-sm font-medium border-l-2 transition-colors ${isActive
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-600'
                    : 'text-gray-600 border-transparent hover:bg-gray-50'
                    }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon size={16} className={isActive ? 'text-indigo-600 flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {getCount()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main column */}
        <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-2 md:gap-4">
          {/* Header with Filters */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full">
            <div className="flex flex-col lg:flex-row w-full gap-2 lg:gap-3 items-center">

              {/* Top Row for Mobile: Dropdown + Filter + Add — the sub-sidebar
                  replaces this switcher at lg+, so it's mobile-only. */}
              <div className="flex items-center gap-2 w-full lg:hidden">
                <SearchableDropdown
                  className="flex-1"
                  options={MASTER_TYPES.map(({ key, label }) => ({ value: key, label }))}
                  value={activeTab}
                  onChange={selectTab}
                />

                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className={`flex items-center justify-center rounded-lg shadow-sm h-[32px] w-[32px] flex-shrink-0 transition ${showMobileFilters ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  <Filter size={14} />
                </button>

                <button
                  onClick={handleAddClick}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center h-[32px] w-[32px] flex-shrink-0 shadow-sm transition active:scale-95"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Search Bar (toggleable on mobile, always visible on desktop) */}
              <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block w-full lg:flex-[1.5] relative animate-in slide-in-from-top-2 duration-200`}>
                <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}s...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg lg:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-sky-500 text-base md:text-sm h-[32px] md:h-[38px] shadow-sm"
                />
              </div>
            </div>

            {/* Desktop Add Button */}
            <button
              onClick={handleAddClick}
              className="hidden lg:flex bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 h-[38px] rounded-lg font-semibold items-center justify-center gap-2 transition shadow-sm w-full lg:w-auto flex-shrink-0 active:scale-95 mt-2 lg:mt-0"
            >
              <Plus size={16} /> Add {activeTab}
            </button>
          </div>

          {/* Main Content Area */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col pt-1 mt-2 flex-1 min-h-0 min-w-0 overflow-hidden">
            {activeTab === 'Company' && <Company searchQuery={searchQuery} triggerAdd={triggerAddCompany} />}
            {activeTab === 'UOM' && <UOM searchQuery={searchQuery} triggerAdd={triggerAddUOM} />}
            {activeTab === 'Sales Person Name' && <LeadReceiverName searchQuery={searchQuery} triggerAdd={triggerAddLRN} />}
            {activeTab === 'Lead Source' && <LeadSource searchQuery={searchQuery} triggerAdd={triggerAddLS} />}
            {activeTab === 'NOB' && <NOB searchQuery={searchQuery} triggerAdd={triggerAddNOB} />}
            {activeTab === 'Credit Days' && <CreditDays searchQuery={searchQuery} triggerAdd={triggerAddCD} />}
            {activeTab === 'Credit Limit' && <CreditLimit searchQuery={searchQuery} triggerAdd={triggerAddCL} />}
            {activeTab === 'Terms and Conditions' && <TermsAndConditions searchQuery={searchQuery} triggerAdd={triggerAddTNC} />}
          </div>
        </div>
      </div>
    </div>
  );
}
