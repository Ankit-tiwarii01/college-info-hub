import React, { useEffect, useState } from 'react';
import API from '../../services/api';
import { 
  Loader2, Search, GraduationCap, Mail, Phone, MapPin, Trash2, Eye, CheckCircle, XCircle, X, Shield, RefreshCw, Filter, Building, Briefcase, Plus, Upload, User, Download, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs';

const AdminUsers = () => {
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('All Courses');
  const [sessionFilter, setSessionFilter] = useState('All Sessions');
  const [selectedAlumnus, setSelectedAlumnus] = useState(null);

  // Add Alumni Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const minAdmissionYear = 2004;
  const maxAdmissionYear = currentYear - 2;

  const initialFormState = {
    name: '',
    enrollment_number: '',
    mobile_number: '',
    email: '',
    date_of_birth: '',
    course_completed: 'MCA',
    year_of_admission: maxAdmissionYear,
    year_of_completion: currentYear,
    profession: 'Private Service',
    designation: '',
    organization: '',
    current_city: '',
    current_state: '',
    current_country: 'India',
    willing_to_attend_events: 'Yes',
    contributions: ['Placements'],
    other_contribution_specify: '',
    linkedin: '',
    facebook: '',
    instagram: '',
    x_twitter: '',
    youtube: '',
  };

  const [addForm, setAddForm] = useState(initialFormState);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const fetchAlumni = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/alumni');
      setAlumni(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to fetch alumni records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlumni();
  }, []);

  // Dynamically extract unique sessions from real database records
  const availableSessions = Array.from(new Set(
    alumni
      .map(a => `${a.year_of_admission}–${a.year_of_completion}`)
      .filter(Boolean)
  )).sort((a, b) => b.localeCompare(a));

  const handleStatusToggle = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await API.put(`/admin/alumni/${id}/status`, { status: nextStatus });
      setAlumni(alumni.map(a => a.id === id ? { ...a, status: nextStatus } : a));
      toast.success(`Alumnus status updated to ${nextStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this alumnus record?')) return;
    try {
      await API.delete(`/admin/alumni/${id}`);
      setAlumni(alumni.filter(a => a.id !== id));
      toast.success('Alumnus record permanently deleted.');
    } catch (err) {
      toast.error('Failed to delete alumnus record.');
    }
  };

  const handleResetFilters = () => {
    setCourseFilter('All Courses');
    setSessionFilter('All Sessions');
    setSearchTerm('');
  };

  // Add Form Handlers
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) {
      toast.error('Image size must be less than 1 MB.');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleContributionToggle = (option) => {
    let updated = [...addForm.contributions];
    if (option === 'Unable to Contribute') {
      updated = ['Unable to Contribute'];
    } else {
      updated = updated.filter(item => item !== 'Unable to Contribute');
      if (updated.includes(option)) {
        updated = updated.filter(item => item !== option);
      } else {
        updated.push(option);
      }
    }
    setAddForm({ ...addForm, contributions: updated });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!addForm.name.trim()) return toast.error('Name is required.');
    if (!addForm.enrollment_number.trim()) return toast.error('University Enrollment Number is required.');
    if (!/^[6-9]\d{9}$/.test(addForm.mobile_number.trim())) return toast.error('Mobile Number must be a valid 10-digit Indian number.');
    if (!addForm.email.trim()) return toast.error('Email is required.');
    if (!addForm.date_of_birth) return toast.error('Date of Birth is required.');
    
    const admYr = parseInt(addForm.year_of_admission, 10);
    const compYr = parseInt(addForm.year_of_completion, 10);

    if (admYr < minAdmissionYear || admYr > maxAdmissionYear) {
      return toast.error(`Year of Admission must be between ${minAdmissionYear} and ${maxAdmissionYear}.`);
    }
    if (compYr < admYr + 2 || compYr > currentYear) {
      return toast.error(`Year of Completion must be between ${admYr + 2} and ${currentYear}.`);
    }

    if (!addForm.current_city.trim() || !addForm.current_state.trim()) {
      return toast.error('Current City and State of Residence are required.');
    }

    setSubmittingAdd(true);
    try {
      const fd = new FormData();
      Object.keys(addForm).forEach(k => {
        if (k === 'contributions') {
          fd.append('contributions', addForm.contributions.join(', '));
        } else if (addForm[k] !== undefined && addForm[k] !== null) {
          fd.append(k, addForm[k]);
        }
      });
      if (photoFile) {
        fd.append('professional_picture', photoFile);
      }

      await API.post('/alumni/register', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Alumnus record created successfully!');
      setIsAddModalOpen(false);
      setAddForm(initialFormState);
      setPhotoFile(null);
      setPhotoPreview(null);
      fetchAlumni();
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to create Alumnus record.';
      toast.error(typeof errMsg === 'string' ? errMsg : 'Validation error.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Combined Course + Session + Search Filtering
  const filteredAlumni = alumni.filter(a => {
    const matchesSearch = 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.enrollment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.organization && a.organization.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.current_city && a.current_city.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCourse = courseFilter === 'All Courses' || a.course_completed === courseFilter;
    
    const sessStr = `${a.year_of_admission}–${a.year_of_completion}`;
    const sessStrAlt = `${a.year_of_admission}-${a.year_of_completion}`;
    const matchesSession = sessionFilter === 'All Sessions' || sessStr === sessionFilter || sessStrAlt === sessionFilter;

    return matchesSearch && matchesCourse && matchesSession;
  });

  const handleExportExcel = async () => {
    if (filteredAlumni.length === 0) {
      toast.error('No records available for the selected filters.');
      return;
    }

    try {
      const params = new URLSearchParams();
      if (courseFilter !== 'All Courses') params.append('course', courseFilter);
      if (sessionFilter !== 'All Sessions') params.append('session', sessionFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await API.get(`/admin/alumni/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      
      let filename = `Alumni_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      if (courseFilter !== 'All Courses') {
        filename = `Alumni_${courseFilter}_${new Date().toISOString().split('T')[0]}.xlsx`;
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel exported successfully!');
    } catch (err) {
      toast.error('Failed to export Excel file.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumbs & Back Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <Breadcrumbs items={[{ label: 'Admin', path: '/admin' }, { label: 'Users' }, { label: 'Alumni Directory' }]} />
        <Link to="/admin" className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 transition">
          <ArrowLeft size={14} /> ← Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap size={24} className="text-amber-600" />
            <h1 className="text-2xl font-serif font-bold text-slate-800">Users Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">Alumni Directory — Real Database Connection & Course + Session Filtering</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={fetchAlumni} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 transition">
            <RefreshCw size={14} /> Refresh Data
          </button>
          <button 
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition"
          >
            <Download size={14} /> Download Excel
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)} 
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition"
          >
            <Plus size={16} /> + Add Alumni
          </button>
        </div>
      </div>

      {/* Course + Session Filter Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          {/* Course Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Filter size={12} className="text-amber-500" /> Course
            </label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
            >
              <option value="All Courses">All Courses</option>
              <option value="MCA">MCA</option>
              <option value="MBA">MBA</option>
              <option value="MTech">MTech</option>
            </select>
          </div>

          {/* Session Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Filter size={12} className="text-amber-500" /> Session
            </label>
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
            >
              <option value="All Sessions">All Sessions</option>
              {availableSessions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Search size={12} className="text-amber-500" /> Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search alumni name, email, company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3.5 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>
          </div>

          {/* Reset Filters */}
          <div>
            <button
              onClick={handleResetFilters}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} /> Reset Filters
            </button>
          </div>
        </div>

        {/* Counter */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs font-bold text-slate-500">
          <span className="text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
            Showing {filteredAlumni.length} Alumni
          </span>
          <span className="text-slate-400">Filter applied: Course ({courseFilter}), Session ({sessionFilter})</span>
        </div>
      </div>

      {/* Alumni Table */}
      {loading ? (
        <div className="flex justify-center p-12 bg-white rounded-3xl border border-slate-100">
          <Loader2 size={32} className="animate-spin text-amber-600" />
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 text-rose-700 rounded-3xl border border-rose-100 font-medium text-sm">
          {error}
        </div>
      ) : filteredAlumni.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 space-y-3">
          <GraduationCap size={40} className="mx-auto text-slate-300" />
          <p className="text-slate-600 font-bold text-base">No Alumni found matching the selected filters.</p>
          <button onClick={handleResetFilters} className="px-4 py-2 bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md">
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 uppercase tracking-wider text-[11px] font-bold text-slate-500">
                <tr>
                  <th className="p-4">Alumnus</th>
                  <th className="p-4">Enrollment No.</th>
                  <th className="p-4">Course</th>
                  <th className="p-4">Session</th>
                  <th className="p-4">Profession & Org</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAlumni.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-md shrink-0">
                          {a.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{a.name}</p>
                          <p className="text-[11px] text-slate-400">{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-700">{a.enrollment_number}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg text-[11px]">
                        {a.course_completed}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-700">
                      {a.year_of_admission}–{a.year_of_completion}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{a.designation || a.profession}</p>
                      <p className="text-[11px] text-slate-400">{a.organization}</p>
                    </td>
                    <td className="p-4 text-slate-600">{a.current_city}, {a.current_state}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        a.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedAlumnus(a)} className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100" title="View Details">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => handleStatusToggle(a.id, a.status)} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100" title="Toggle Status">
                          <CheckCircle size={16} />
                        </button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100" title="Delete Record">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {selectedAlumnus && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedAlumnus(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => setSelectedAlumnus(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-100 transition">
                <ArrowLeft size={14} /> ← Back to Users
              </button>
              <button onClick={() => setSelectedAlumnus(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-bold flex items-center justify-center text-lg">
                {selectedAlumnus.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-slate-900">{selectedAlumnus.name}</h3>
                <p className="text-xs text-amber-700 font-bold">{selectedAlumnus.course_completed} ({selectedAlumnus.year_of_admission}–{selectedAlumnus.year_of_completion})</p>
              </div>
            </div>
            
            <div className="space-y-3 text-xs text-slate-700 border-t border-slate-100 pt-4">
              <p><strong>Enrollment Number:</strong> {selectedAlumnus.enrollment_number}</p>
              <p><strong>Email:</strong> {selectedAlumnus.email}</p>
              <p><strong>Mobile:</strong> {selectedAlumnus.mobile_number}</p>
              <p><strong>Designation:</strong> {selectedAlumnus.designation}</p>
              <p><strong>Organization:</strong> {selectedAlumnus.organization}</p>
              <p><strong>City:</strong> {selectedAlumnus.current_city}, {selectedAlumnus.current_state}</p>
              {selectedAlumnus.linkedin && (
                <p><strong>LinkedIn:</strong> <a href={selectedAlumnus.linkedin} target="_blank" rel="noreferrer" className="text-amber-600 underline font-bold">{selectedAlumnus.linkedin}</a></p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setSelectedAlumnus(null)} className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Add Alumni Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsAddModalOpen(false)}>
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] shadow-2xl overflow-y-auto custom-scrollbar p-8 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100">
              <X size={20} />
            </button>

            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center font-bold">
                <User size={20} />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold text-slate-900">Admin Add Alumni Registration</h2>
                <p className="text-xs text-slate-500">Manually register an alumnus into the Campus InfoHub database</p>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-6 text-xs">
              {/* Section 1: Personal Details */}
              <div>
                <h3 className="font-serif font-bold text-slate-800 text-sm mb-3">1. Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">1. Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Given Name Middle Name Last Name"
                      value={addForm.name}
                      onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">2. University Enrollment Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="Enrollment Number"
                      value={addForm.enrollment_number}
                      onChange={e => setAddForm({ ...addForm, enrollment_number: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">3. Mobile Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="10-digit Indian Mobile Number"
                      value={addForm.mobile_number}
                      onChange={e => setAddForm({ ...addForm, mobile_number: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">4. Email ID *</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={addForm.email}
                      onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">5. Date of Birth *</label>
                    <input
                      type="date"
                      required
                      value={addForm.date_of_birth}
                      onChange={e => setAddForm({ ...addForm, date_of_birth: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Academic Info */}
              <div>
                <h3 className="font-serif font-bold text-slate-800 text-sm mb-3">2. Academic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">6. Course Completed *</label>
                    <select
                      value={addForm.course_completed}
                      onChange={e => setAddForm({ ...addForm, course_completed: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="MCA">MCA</option>
                      <option value="MBA">MBA</option>
                      <option value="MTech">MTech</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">7. Year of Admission * ({minAdmissionYear}–{maxAdmissionYear})</label>
                    <input
                      type="number"
                      min={minAdmissionYear}
                      max={maxAdmissionYear}
                      required
                      value={addForm.year_of_admission}
                      onChange={e => {
                        const adm = parseInt(e.target.value, 10) || minAdmissionYear;
                        setAddForm({
                          ...addForm,
                          year_of_admission: adm,
                          year_of_completion: Math.max(addForm.year_of_completion, adm + 2)
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">8. Year of Completion * (Max {currentYear})</label>
                    <input
                      type="number"
                      min={addForm.year_of_admission + 2}
                      max={currentYear}
                      required
                      value={addForm.year_of_completion}
                      onChange={e => setAddForm({ ...addForm, year_of_completion: parseInt(e.target.value, 10) || currentYear })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Professional Info */}
              <div>
                <h3 className="font-serif font-bold text-slate-800 text-sm mb-3">3. Professional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">11. Profession *</label>
                    <select
                      value={addForm.profession}
                      onChange={e => {
                        const prof = e.target.value;
                        let desig = addForm.designation;
                        let org = addForm.organization;
                        if (prof === 'Home Maker' || prof === 'Unemployed') {
                          desig = 'NA';
                          org = 'NA';
                        }
                        setAddForm({ ...addForm, profession: prof, designation: desig, organization: org });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
                    >
                      {['Government Service', 'Private Service', 'Public Sector Undertaking Service', 'Business/Entrepreneur', 'Self-Employed', 'Home Maker', 'Studying', 'Unemployed'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">12. Designation *</label>
                    <input
                      type="text"
                      required
                      disabled={addForm.profession === 'Home Maker' || addForm.profession === 'Unemployed'}
                      value={addForm.designation}
                      onChange={e => setAddForm({ ...addForm, designation: e.target.value })}
                      placeholder="e.g. Senior Software Engineer"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">13. Organization *</label>
                    <input
                      type="text"
                      required
                      disabled={addForm.profession === 'Home Maker' || addForm.profession === 'Unemployed'}
                      value={addForm.organization}
                      onChange={e => setAddForm({ ...addForm, organization: e.target.value })}
                      placeholder="e.g. Google India"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Residence */}
              <div>
                <h3 className="font-serif font-bold text-slate-800 text-sm mb-3">4. Residence</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">14. City *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bengaluru"
                      value={addForm.current_city}
                      onChange={e => setAddForm({ ...addForm, current_city: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">15. State *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Karnataka"
                      value={addForm.current_state}
                      onChange={e => setAddForm({ ...addForm, current_state: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">16. Country *</label>
                    <input
                      type="text"
                      required
                      value={addForm.current_country}
                      onChange={e => setAddForm({ ...addForm, current_country: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Picture Upload */}
              <div>
                <h3 className="font-serif font-bold text-slate-800 text-sm mb-2">5. Professional Picture (Optional)</h3>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-14 h-14 rounded-xl object-cover border" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                      <User size={24} />
                    </div>
                  )}
                  <div>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="text-xs" />
                    <p className="text-[11px] text-slate-400 mt-1">Max 1 MB. JPG, PNG, WebP.</p>
                  </div>
                </div>
              </div>

              {/* Section 6: Social Media Links */}
              <div>
                <h3 className="font-serif font-bold text-slate-800 text-sm mb-3">6. Social Media Profiles (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="url"
                    placeholder="LinkedIn Profile URL"
                    value={addForm.linkedin}
                    onChange={e => setAddForm({ ...addForm, linkedin: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none"
                  />
                  <input
                    type="url"
                    placeholder="Facebook Profile URL"
                    value={addForm.facebook}
                    onChange={e => setAddForm({ ...addForm, facebook: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none"
                  />
                </div>
              </div>

              {/* Section 7: Alumni Engagement */}
              <div>
                <h3 className="font-serif font-bold text-slate-800 text-sm mb-3">7. Engagement & Contributions</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Willingness to Attend Events *</label>
                    <div className="flex gap-4">
                      {['Yes', 'No'].map(opt => (
                        <label key={opt} className="flex items-center gap-2 font-bold cursor-pointer">
                          <input
                            type="radio"
                            name="willing_to_attend"
                            value={opt}
                            checked={addForm.willing_to_attend_events === opt}
                            onChange={e => setAddForm({ ...addForm, willing_to_attend_events: e.target.value })}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-2">Contribution Options *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['Financially (Individual)', 'Financially (As a batch)', 'Placements', 'Services', 'Unable to Contribute', 'Other'].map(opt => (
                        <label key={opt} className="flex items-center gap-2 font-medium cursor-pointer p-2 bg-slate-50 rounded-xl border border-slate-100">
                          <input
                            type="checkbox"
                            checked={addForm.contributions.includes(opt)}
                            onChange={() => handleContributionToggle(opt)}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                    {addForm.contributions.includes('Other') && (
                      <input
                        type="text"
                        required
                        placeholder="Please specify other contribution..."
                        value={addForm.other_contribution_specify}
                        onChange={e => setAddForm({ ...addForm, other_contribution_specify: e.target.value })}
                        className="w-full mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={submittingAdd} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-md flex items-center gap-2">
                  {submittingAdd ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Register Alumnus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
