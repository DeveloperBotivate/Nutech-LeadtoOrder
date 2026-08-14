import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Plus, Minus, Paperclip, Check, X, PhoneOutgoing } from 'lucide-react';
import { getCompanies, saveCompanies, saveCompany, getNOBs } from '../../utils/storageManager';
import { generateId, fileToBase64 } from '../../utils/helpers';
import { mockApi } from '../../services/mockApi';
import { AuthContext } from '../../App';
import DataTable from '../../components/DataTable';
import ModalAlert from '../../components/ModalAlert';
import ModalForm from '../../components/ModalForm';
import InfoPopover from '../../components/InfoPopover';

const emptyContact = () => ({ name: '', designation: '', number: '' });

const INDIAN_STATES = [
    "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", 
    "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", 
    "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", 
    "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", 
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", 
    "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const emptyFormData = () => ({
  name: '', gst: '', email: '', phone: '', address: '', state: '', city: '',
  nob: '', division: '', contactPersons: [emptyContact()], proof: ''
});

export default function Company({ searchQuery, triggerAdd }) {
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  const [companies, setCompanies] = useState([]);
  const [nobOptions, setNobOptions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '', onConfirm: () => {} });

  const [formData, setFormData] = useState(emptyFormData());

  const headers = [
    'Actions', 'Timestamp', 'VN-NO', 'Company Name', 'Company GST', 'Company Email',
    'Phone Number', 'State', 'City', 'NOB', 'Division', 'Contact Person', 'Proof', 'Address'
  ];

  useEffect(() => {
    setCompanies(getCompanies());
    // NOB options come from the NOB Master page, not free text.
    setNobOptions(getNOBs().map(n => n.name).filter(Boolean));
  }, []);

  useEffect(() => {
    if (triggerAdd > 0) handleAdd();
  }, [triggerAdd]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const q = searchQuery.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.vnNo?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.gst?.toLowerCase().includes(q) ||
        c.state?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.division?.toLowerCase().includes(q) ||
        c.contactPersons?.some(p => p.name?.toLowerCase().includes(q))
      );
    });
  }, [companies, searchQuery]);

  const sortedCompanies = useMemo(() => [...filteredCompanies].reverse(), [filteredCompanies]);
  const totalPages = Math.ceil(sortedCompanies.length / itemsPerPage);
  const paginatedCompanies = sortedCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyFormData());
    setShowModal(true);
  };

  const handleEdit = (company) => {
    setEditingId(company.id);
    setFormData({
      ...emptyFormData(),
      ...company,
      contactPersons: company.contactPersons && company.contactPersons.length > 0 ? company.contactPersons : [emptyContact()]
    });
    setShowModal(true);
  };

  const handleContactChange = (index, field, value) => {
    const updated = [...formData.contactPersons];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, contactPersons: updated });
  };

  const handleAddContact = () => setFormData({ ...formData, contactPersons: [...formData.contactPersons, emptyContact()] });
  const handleRemoveContact = (index) => {
    const updated = formData.contactPersons.filter((_, i) => i !== index);
    setFormData({ ...formData, contactPersons: updated.length > 0 ? updated : [emptyContact()] });
  };

  const handleProofChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showAlert('error', 'File Too Large', 'Please upload an image smaller than 2MB.');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setFormData({ ...formData, proof: base64 });
    } catch (error) {
      showAlert('error', 'Upload Failed', 'Could not read the selected file. Please try again.');
    }
  };

  const showAlert = (type, title, message, onConfirm = () => {}) => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const handleDelete = (id) => {
    showAlert('confirm', 'Delete Company?', 'Are you sure you want to remove this company from the records?', () => {
      const updated = companies.filter(c => c.id !== id);
      saveCompanies(updated);
      setCompanies(updated);
      showAlert('success', 'Deleted!', 'The company record has been removed successfully.');
    });
  };

  // Navigate straight to the Follow-Up form with the company's data passed in state.
  // The lead will only be created and saved when the user submits the Follow-Up form.
  const handleEnquiry = (company) => {
    navigate('/follow-up/new', { state: { companyContext: company } });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanContacts = formData.contactPersons.filter(p => p.name.trim() || p.designation.trim() || p.number.trim());
    const finalData = { ...formData, contactPersons: cleanContacts.length > 0 ? cleanContacts : [emptyContact()] };

    if (editingId) {
      const updated = companies.map(c => c.id === editingId ? { ...c, ...finalData } : c);
      saveCompanies(updated);
      setCompanies(updated);
      showAlert('success', 'Updated!', 'Company information has been updated.');
    } else {
      const newCompany = {
        ...finalData,
        id: generateId(),
        timestamp: new Date().toISOString(),
        vnNo: `CN-${String(companies.length + 1).padStart(3, '0')}`
      };
      saveCompany(newCompany);
      setCompanies([...companies, newCompany]);
      showAlert('success', 'Saved!', 'New company has been successfully registered.');
    }
    setShowModal(false);
  };

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  const contactSummaryItems = (contactPersons) => (contactPersons || [])
    .filter(p => p.name || p.designation || p.number)
    .map(p => `${p.name || '-'} | ${p.designation || '-'} | ${p.number || '-'}`);

  const renderRow = (item) => {
    const contacts = item.contactPersons || [];
    const primaryContact = contacts[0];
    return (
      <tr key={item.id} className="hover:bg-gray-50 transition-colors text-center text-sm">
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleEnquiry(item)}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors whitespace-nowrap"
            >
              <PhoneOutgoing size={12} /> Enquiry
            </button>
            <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-800"><Edit size={16} /></button>
            <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
          </div>
        </td>
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatTimestamp(item.timestamp)}</td>
        <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{item.vnNo}</td>
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-bold">{item.name}</td>
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap uppercase">{item.gst}</td>
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.email}</td>
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.phone}</td>
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.state}</td>
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.city}</td>
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.nob}</td>
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.division}</td>
        <td className="px-4 py-3 whitespace-nowrap">
          <InfoPopover items={contactSummaryItems(contacts)} title="Contact Persons">
            <div className="flex flex-col items-center cursor-help">
              <span className="font-medium text-gray-800">{primaryContact?.name || '-'}</span>
              {primaryContact?.designation && <span className="text-[10px] text-gray-400 uppercase">{primaryContact.designation}</span>}
              {contacts.length > 1 && (
                <span className="mt-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded border border-amber-200">
                  +{contacts.length - 1}
                </span>
              )}
            </div>
          </InfoPopover>
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          {item.proof ? (
            <a href={item.proof} target="_blank" rel="noopener noreferrer">
              <img src={item.proof} alt="Proof" className="w-9 h-9 object-cover rounded border border-gray-200 mx-auto hover:scale-150 transition-transform" />
            </a>
          ) : (
            <span className="text-gray-300 text-xs">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
          <InfoPopover items={[item.address]} title="Company Address">
            <span className="truncate max-w-[100px] block cursor-help italic">"{item.address}"</span>
          </InfoPopover>
        </td>
      </tr>
    );
  };

  const renderCard = (item) => {
    const contacts = item.contactPersons || [];
    return (
      <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
          <div className="flex flex-col"><span className="text-[10px] font-medium text-indigo-600 uppercase tracking-widest">{item.vnNo}</span><h3 className="text-base font-medium text-gray-700 mt-1">{item.name}</h3></div>
          <div className="flex gap-2">
            {item.proof && (
              <a href={item.proof} target="_blank" rel="noopener noreferrer">
                <img src={item.proof} alt="Proof" className="w-9 h-9 object-cover rounded border border-gray-200" />
              </a>
            )}
            <button onClick={() => handleEnquiry(item)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl" title="Raise Enquiry"><PhoneOutgoing size={16}/></button>
            <button onClick={() => handleEdit(item)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Edit size={16}/></button>
            <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16}/></button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-y-3 text-[11px]">
          <div className="grid grid-cols-2 gap-4 border-b border-gray-50 pb-2">
            <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase">GST</p><p className="text-xs font-bold text-gray-800 uppercase">{item.gst}</p></div>
            <div className="space-y-1 text-right"><p className="text-[10px] text-gray-400 font-bold uppercase">Phone</p><p className="text-xs font-bold text-gray-800">{item.phone}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-b border-gray-50 pb-2">
            <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase">Email</p><p className="text-xs font-bold text-gray-800 truncate">{item.email}</p></div>
            <div className="space-y-1 text-right"><p className="text-[10px] text-gray-400 font-bold uppercase">State / City</p><p className="text-xs font-bold text-gray-800">{item.state} / {item.city}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-b border-gray-50 pb-2">
            <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase">NOB</p><p className="text-xs font-bold text-gray-800">{item.nob}</p></div>
            <div className="space-y-1 text-right"><p className="text-[10px] text-gray-400 font-bold uppercase">Division</p><p className="text-xs font-bold text-gray-800">{item.division}</p></div>
          </div>
          <div className="space-y-1.5 border-b border-gray-50 pb-2">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Contact Persons</p>
            {contacts.filter(p => p.name || p.designation || p.number).map((p, i) => (
              <p key={i} className="text-xs font-medium text-gray-800">{p.name} <span className="text-gray-400">— {p.designation}</span> <span className="text-gray-400">({p.number})</span></p>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 bg-gray-50 p-2 rounded-lg">
            <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase">Company Address</p><p className="text-xs text-gray-700 leading-tight italic">"{item.address}"</p></div>
          </div>
        </div>
        <div className="pt-2 flex justify-between items-center border-t border-gray-50"><span className="text-[10px] text-gray-400 font-medium">{formatTimestamp(item.timestamp)}</span></div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 w-full min-h-0">
      <DataTable
        headers={headers}
        data={paginatedCompanies}
        renderRow={renderRow}
        renderCard={renderCard}
        minWidth="1500px"
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalResults={filteredCompanies.length}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
      />

      <ModalAlert
        {...alertConfig}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />

      <ModalForm
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Company' : 'New Company Setup'}
        onSubmit={handleSubmit}
        submitText={editingId ? 'Update' : 'Save'}
        maxWidth="max-w-3xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Full Name (Company Name) *</label>
            <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Company GST *</label>
            <input required type="text" value={formData.gst} onChange={(e) => setFormData({...formData, gst: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] uppercase h-[30px] md:h-[34px]" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Company Email Address *</label>
            <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Phone Number *</label>
            <input required type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">State *</label>
            <select required value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]">
              <option value="">Select State</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">City *</label>
            <input required type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">NOB</label>
            <select value={formData.nob} onChange={(e) => setFormData({...formData, nob: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]">
              <option value="">Select NOB</option>
              {nobOptions.map((nob) => (
                <option key={nob} value={nob}>{nob}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Division</label>
            <input type="text" value={formData.division} onChange={(e) => setFormData({...formData, division: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]" />
          </div>
        </div>

        <div className="space-y-1 pt-1.5 border-t border-gray-50">
          <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Company Address *</label>
          <textarea required rows="1" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px]" />
        </div>

        <div className="space-y-1.5 pt-2 border-t border-gray-50">
          <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Contact Person Details</label>
          <div className="space-y-2">
            {formData.contactPersons.map((contact, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                <input
                  type="text"
                  value={contact.name}
                  onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                  placeholder="Contact Person Name"
                  required={index === 0}
                  className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]"
                />
                <input
                  type="text"
                  value={contact.designation}
                  onChange={(e) => handleContactChange(index, 'designation', e.target.value)}
                  placeholder="Designation"
                  required={index === 0}
                  className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]"
                />
                <div className="flex gap-2 items-center">
                  <input
                    type="tel"
                    value={contact.number}
                    onChange={(e) => handleContactChange(index, 'number', e.target.value)}
                    placeholder="Contact Person Number"
                    required={index === 0}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]"
                  />
                  <button type="button" onClick={() => handleRemoveContact(index)} className="text-red-400 hover:text-red-600 transition-all flex-shrink-0">
                    <Minus size={16}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-1">
            <button type="button" onClick={handleAddContact} className="flex items-center gap-1.5 text-[10px] font-black bg-indigo-600 text-white px-3 py-1.5 rounded shadow-sm hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-widest">
              <Plus size={14}/> Add Contact Person
            </button>
          </div>
        </div>

        <div className="space-y-1 pt-1.5 border-t border-gray-50">
          <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Proof (Image Upload)</label>
          <div className="flex items-center gap-2">
            <label className="flex-1 cursor-pointer group">
              <div className={`flex items-center justify-center gap-2 border border-dashed rounded h-[30px] md:h-[34px] transition-all
                ${formData.proof ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50 border-gray-300 text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600'}
              `}>
                {formData.proof ? <Check size={14} /> : <Paperclip size={14} />}
                <span className="text-[11px] md:text-[13px] uppercase tracking-wider">
                  {formData.proof ? 'Attached' : 'Browse Image'}
                </span>
              </div>
              <input
                type="file"
                onChange={handleProofChange}
                className="hidden"
                accept="image/*"
              />
            </label>
            {formData.proof && (
              <>
                <img src={formData.proof} alt="Proof preview" className="w-[30px] h-[30px] md:w-[34px] md:h-[34px] object-cover rounded border border-gray-200" />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, proof: '' })}
                  className="w-[30px] h-[30px] md:w-[34px] md:h-[34px] flex items-center justify-center text-gray-300 hover:text-red-500 bg-gray-50 rounded border border-gray-200 transition-colors flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
