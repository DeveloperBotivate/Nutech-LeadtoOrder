import React, { useState } from 'react';
import { Search, Plus, Filter } from 'lucide-react';
import Company from './Company';
import UOM from './UOM';
import LeadReceiverName from './LeadReceiverName';
import LeadSource from './LeadSource';
import NOB from './NOB';
import CreditDays from './CreditDays';
import CreditLimit from './CreditLimit';
import TermsAndConditions from './TermsAndConditions';
import SearchableDropdown from '../../components/SearchableDropdown';

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
    else if (activeTab === 'Lead Receiver Name') setTriggerAddLRN(prev => prev + 1);
    else if (activeTab === 'Lead Source') setTriggerAddLS(prev => prev + 1);
    else if (activeTab === 'NOB') setTriggerAddNOB(prev => prev + 1);
    else if (activeTab === 'Credit Days') setTriggerAddCD(prev => prev + 1);
    else if (activeTab === 'Credit Limit') setTriggerAddCL(prev => prev + 1);
    else if (activeTab === 'Terms and Conditions') setTriggerAddTNC(prev => prev + 1);
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full">
        <div className="flex flex-col lg:flex-row w-full gap-2 lg:gap-3 items-center">

          {/* Top Row for Mobile: Dropdown + Filter + Add */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            {/* 1. Searchable Drop-Down (Switcher) */}
            <SearchableDropdown
              className="flex-1 lg:w-64"
              options={[
                { value: 'Company', label: 'Company' },
                { value: 'UOM', label: 'UOM' },
                { value: 'Lead Receiver Name', label: 'Lead Receiver Name' },
                { value: 'Lead Source', label: 'Lead Source' },
                { value: 'NOB', label: 'NOB' },
                { value: 'Credit Days', label: 'Credit Days' },
                { value: 'Credit Limit', label: 'Credit Limit' },
                { value: 'Terms and Conditions', label: 'Terms and Conditions' }
              ]}
              value={activeTab}
              onChange={(val) => {
                setActiveTab(val);
                setShowMobileFilters(false);
              }}
            />

            {/* 2. Mobile Filter Button */}
            <button
               onClick={() => setShowMobileFilters(!showMobileFilters)}
               className={`lg:hidden flex items-center justify-center rounded-lg shadow-sm h-[32px] w-[32px] flex-shrink-0 transition ${showMobileFilters ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter size={14} />
            </button>

            {/* 3. Mobile Add Button */}
            <button
              onClick={handleAddClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center lg:hidden h-[32px] w-[32px] flex-shrink-0 shadow-sm transition active:scale-95"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* 4. Search Bar (Toggleable on mobile) */}
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
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col pt-1 mt-2 flex-1 min-h-0 overflow-hidden">
        {activeTab === 'Company' && <Company searchQuery={searchQuery} triggerAdd={triggerAddCompany} />}
        {activeTab === 'UOM' && <UOM searchQuery={searchQuery} triggerAdd={triggerAddUOM} />}
        {activeTab === 'Lead Receiver Name' && <LeadReceiverName searchQuery={searchQuery} triggerAdd={triggerAddLRN} />}
        {activeTab === 'Lead Source' && <LeadSource searchQuery={searchQuery} triggerAdd={triggerAddLS} />}
        {activeTab === 'NOB' && <NOB searchQuery={searchQuery} triggerAdd={triggerAddNOB} />}
        {activeTab === 'Credit Days' && <CreditDays searchQuery={searchQuery} triggerAdd={triggerAddCD} />}
        {activeTab === 'Credit Limit' && <CreditLimit searchQuery={searchQuery} triggerAdd={triggerAddCL} />}
        {activeTab === 'Terms and Conditions' && <TermsAndConditions searchQuery={searchQuery} triggerAdd={triggerAddTNC} />}
      </div>
    </div>
  );
}
