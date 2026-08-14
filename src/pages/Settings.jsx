"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import { getUsers, saveUsers, saveUser } from '../utils/storageManager';
import { generateId } from '../utils/helpers';
import DataTable from '../components/DataTable';
import ModalAlert from '../components/ModalAlert';
import ModalForm from '../components/ModalForm';
import { SearchIcon } from '../components/Icons';

const emptyFormData = () => ({
  username: '', password: '', userType: 'user', division: ''
});

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: 'success', title: '', message: '', onConfirm: () => {} });
  const [formData, setFormData] = useState(emptyFormData());

  const headers = ['Actions', 'Timestamp', 'User No.', 'Username', 'Password', 'Role', 'Division'];

  useEffect(() => {
    setUsers(getUsers());
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      u.username?.toLowerCase().includes(q) ||
      u.division?.toLowerCase().includes(q) ||
      u.userType?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const sortedUsers = useMemo(() => [...filteredUsers].reverse(), [filteredUsers]);
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const showAlert = (type, title, message, onConfirm = () => {}) => {
    setAlertConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const handleAdd = () => {
    setEditingId(null);
    setFormData(emptyFormData());
    setFormError('');
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setFormData({ ...emptyFormData(), ...user });
    setFormError('');
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (users.length <= 1) {
      showAlert('error', 'Cannot Delete', 'At least one user must remain so login keeps working.');
      return;
    }
    showAlert('confirm', 'Delete User?', 'Are you sure you want to remove this user? They will no longer be able to log in.', () => {
      const updated = users.filter(u => u.id !== id);
      saveUsers(updated);
      setUsers(updated);
      showAlert('success', 'Deleted!', 'The user has been removed.');
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    const username = formData.username.trim();
    const password = formData.password.trim();

    if (!username || !password) {
      setFormError('Username and password are required.');
      return;
    }

    // Usernames are what login matches on — keep them unique (case-insensitive).
    const duplicate = users.some(u =>
      u.username.toLowerCase() === username.toLowerCase() && u.id !== editingId
    );
    if (duplicate) {
      setFormError('That username is already in use by another user.');
      return;
    }

    const finalData = { ...formData, username, password };

    if (editingId) {
      const updated = users.map(u => u.id === editingId ? { ...u, ...finalData } : u);
      saveUsers(updated);
      setUsers(updated);
      showAlert('success', 'Updated!', 'User details have been updated.');
    } else {
      const newUser = {
        ...finalData,
        id: generateId(),
        timestamp: new Date().toISOString(),
        userNo: `USR-${String(users.length + 1).padStart(3, '0')}`
      };
      saveUser(newUser);
      setUsers([...users, newUser]);
      showAlert('success', 'Saved!', 'New user has been created and can now log in.');
    }
    setShowModal(false);
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const renderRow = (item) => (
    <tr key={item.id} className="hover:bg-gray-50 transition-colors text-center text-sm">
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-800"><Edit size={16} /></button>
          <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatTimestamp(item.timestamp)}</td>
      <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">{item.userNo}</td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-bold">{item.username}</td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono">{item.password}</td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.userType === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'}`}>
          {item.userType === 'admin' ? 'Admin' : 'User'}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.division || '-'}</td>
    </tr>
  );

  const renderCard = (item) => (
    <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-indigo-600 uppercase tracking-widest">{item.userNo}</span>
          <h3 className="text-base font-medium text-gray-700 mt-1">{item.username}</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleEdit(item)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Edit size={16} /></button>
          <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-[11px]">
        <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase">Password</p><p className="text-xs font-mono font-bold text-gray-800">{item.password}</p></div>
        <div className="space-y-1 text-right"><p className="text-[10px] text-gray-400 font-bold uppercase">Role</p><p className="text-xs font-bold text-gray-800">{item.userType === 'admin' ? 'Admin' : 'User'}</p></div>
        <div className="space-y-1"><p className="text-[10px] text-gray-400 font-bold uppercase">Division</p><p className="text-xs font-bold text-gray-800">{item.division || '-'}</p></div>
      </div>
    </div>
  );

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">
      {/* Header with Search + Add */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full">
        <div className="relative w-full lg:flex-1 lg:max-w-md">
          <SearchIcon className="absolute left-2.5 top-[11px] h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-2 py-2 focus:outline-none focus:border-sky-500 text-sm shadow-sm"
          />
        </div>

        <button
          onClick={handleAdd}
          className="flex bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 h-[38px] rounded-lg font-semibold items-center justify-center gap-2 transition shadow-sm w-full lg:w-auto flex-shrink-0 active:scale-95"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col pt-1 mt-2 flex-1 min-h-0 overflow-hidden">
        <DataTable
          headers={headers}
          data={paginatedUsers}
          renderRow={renderRow}
          renderCard={renderCard}
          minWidth="900px"
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalResults={filteredUsers.length}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
        />
      </div>

      <ModalAlert
        {...alertConfig}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />

      <ModalForm
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Edit User' : 'Add User'}
        onSubmit={handleSubmit}
        submitText={editingId ? 'Update' : 'Save'}
        maxWidth="max-w-md"
      >
        {formError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">{formError}</div>
        )}

        <div className="space-y-1">
          <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Username *</label>
          <input
            required
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Password *</label>
          <input
            required
            type="text"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] font-mono h-[30px] md:h-[34px]"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Role *</label>
          <select
            required
            value={formData.userType}
            onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
            className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] md:text-[12px] font-medium text-gray-700 uppercase tracking-tight">Division</label>
          <input
            type="text"
            value={formData.division}
            onChange={(e) => setFormData({ ...formData, division: e.target.value })}
            placeholder="e.g. Sales, Operations"
            className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] md:text-[13px] h-[30px] md:h-[34px]"
          />
        </div>
      </ModalForm>
    </div>
  );
}
