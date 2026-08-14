import React, { useState, useEffect, useMemo } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { getTermsAndConditions, saveTermsAndConditions } from '../../utils/storageManager';
import { generateId } from '../../utils/helpers';
import DataTable from '../../components/DataTable';
import ModalAlert from '../../components/ModalAlert';
import ModalForm from '../../components/ModalForm';

// These six terms map 1:1 to the fixed fields on the Quotation form's
// Terms & Conditions section — see TERM_FIELD_MAP in storageManager.js.
const ALL_TERMS = ['Validity', 'Payment Terms', 'Delivery', 'Freight', 'Insurance', 'Taxes'];

const emptyFormData = () => ({ term: '', description: '' });

export default function TermsAndConditions({ searchQuery, triggerAdd }) {
  const [data, setData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '', onConfirm: () => {} });
  const [formData, setFormData] = useState(emptyFormData());

  const headers = ['Actions', 'Timestamp', 'TNC-NO', 'Term', 'Description'];

  useEffect(() => {
    setData(getTermsAndConditions());
  }, []);

  useEffect(() => {
    if (triggerAdd > 0) handleAdd();
  }, [triggerAdd]);

  // Terms not yet configured — only these can be picked when adding a new entry.
  const availableTerms = useMemo(() => {
    const used = new Set(data.map(item => item.term));
    return ALL_TERMS.filter(term => !used.has(term));
  }, [data]);

  const filteredData = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return data.filter(item => (
      item.term?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.tncNo?.toLowerCase().includes(q)
    ));
  }, [data, searchQuery]);

  const sortedData = useMemo(() => [...filteredData].reverse(), [filteredData]);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const showAlert = (type, title, message, onConfirm = () => {}) => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyFormData());
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ term: item.term, description: item.description });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    showAlert(
      'confirm',
      'Delete Term?',
      'Quotations will fall back to a blank default for this term until it is added again. Continue?',
      () => {
        const updated = data.filter(item => item.id !== id);
        saveTermsAndConditions(updated);
        setData(updated);
        showAlert('success', 'Deleted!', 'The term has been removed.');
      }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.term) {
      showAlert('error', 'Error', 'Please select a term.');
      return;
    }

    if (editingId) {
      const updated = data.map(item => item.id === editingId ? { ...item, description: formData.description } : item);
      saveTermsAndConditions(updated);
      setData(updated);
      showAlert('success', 'Updated!', 'Term has been updated.');
    } else {
      const newItem = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        tncNo: `TNC-${String(data.length + 1).padStart(3, '0')}`,
        term: formData.term,
        description: formData.description,
      };
      const updatedData = [...data, newItem];
      saveTermsAndConditions(updatedData);
      setData(updatedData);
      showAlert('success', 'Saved!', 'New term has been added.');
    }
    setShowModal(false);
  };

  const formatTimestamp = (isoString) => {
    const date = new Date(isoString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  const renderRow = (item) => (
    <tr key={item.id} className="hover:bg-gray-50 transition-colors text-center text-sm">
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-800 transition-colors"><Edit size={16} /></button>
          <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 size={16} /></button>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatTimestamp(item.timestamp)}</td>
      <td className="px-4 py-3 text-gray-900 font-bold whitespace-nowrap">{item.tncNo}</td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap uppercase font-medium">{item.term}</td>
      <td className="px-4 py-3 text-gray-600 text-left max-w-xs">{item.description}</td>
    </tr>
  );

  const renderCard = (item) => (
    <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 relative">
      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
        <div>
          <span className="text-[10px] font-medium text-indigo-600 uppercase tracking-widest">{item.tncNo}</span>
          <h3 className="text-sm font-medium text-gray-700 mt-1 uppercase">{item.term}</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleEdit(item)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Edit size={16} /></button>
          <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="text-sm text-gray-600">
        {item.description}
      </div>
      <div className="pt-2 flex justify-between items-center border-t border-gray-50">
        <span className="text-[10px] text-gray-400 font-medium">{formatTimestamp(item.timestamp)}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 w-full min-h-0">
      <DataTable
        headers={headers}
        data={paginatedData}
        renderRow={renderRow}
        renderCard={renderCard}
        minWidth="700px"
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalResults={filteredData.length}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
      />

      <ModalAlert {...alertConfig} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />

      <ModalForm
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit Term' : 'Add Term'}
        onSubmit={handleSubmit}
        submitText={editingId ? 'Update' : 'Save'}
      >
        <div className="space-y-1">
          <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Term *</label>
          {editingId ? (
            <input
              type="text"
              value={formData.term}
              disabled
              className="w-full border border-gray-300 rounded px-2 py-1 text-[11px] md:text-[13px] h-[30px] md:h-[34px] bg-gray-100 text-gray-500"
            />
          ) : (
            <select
              required
              value={formData.term}
              onChange={(e) => setFormData({ ...formData, term: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]"
            >
              <option value="">Select term</option>
              {availableTerms.map((term) => (
                <option key={term} value={term}>{term}</option>
              ))}
            </select>
          )}
          {!editingId && availableTerms.length === 0 && (
            <p className="text-[10px] text-amber-600 pt-1">All six terms are already configured — edit an existing entry to change its wording.</p>
          )}
        </div>

        <div className="space-y-1 pt-1.5 border-t border-gray-50">
          <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Description *</label>
          <textarea
            required
            rows="3"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px]"
            placeholder="Enter the wording shown on quotations for this term"
          />
        </div>
      </ModalForm>
    </div>
  );
}
