import React, { useEffect, useState } from 'react';
import API from '../../services/api';
import { 
  Loader2, Megaphone, Plus, Trash2, Edit3, Eye, CheckCircle, XCircle, X, RefreshCw, ArrowLeft 
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs';

const AdminNotices = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'Examination',
    target_course: 'All Courses',
    target_audience: 'All Students',
    published_date: new Date().toISOString().split('T')[0],
    is_published: true,
  });

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/notices');
      setNotices(res.data);
    } catch (err) {
      toast.error('Failed to fetch notices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleOpenCreate = () => {
    setEditingNotice(null);
    setFormData({
      title: '',
      content: '',
      category: 'Examination',
      target_course: 'All Courses',
      target_audience: 'All Students',
      published_date: new Date().toISOString().split('T')[0],
      is_published: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title || '',
      content: notice.content || '',
      category: notice.category || 'Examination',
      target_course: notice.target_course || 'All Courses',
      target_audience: notice.target_audience || 'All Students',
      published_date: notice.published_date ? new Date(notice.published_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      is_published: notice.is_published !== undefined ? notice.is_published : true,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Strict Frontend Validation
    if (!formData.title.trim()) {
      toast.error('Notice title is required.');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('Notice content is required.');
      return;
    }
    if (!formData.category) {
      toast.error('Please select a category.');
      return;
    }
    if (!formData.target_course) {
      toast.error('Please select a target course.');
      return;
    }
    if (!formData.target_audience) {
      toast.error('Please select a target audience.');
      return;
    }
    if (formData.is_published && !formData.published_date) {
      toast.error('Published date is required.');
      return;
    }

    try {
      if (editingNotice) {
        const res = await API.put(`/admin/notices/${editingNotice.id}`, formData);
        setNotices(notices.map(n => n.id === editingNotice.id ? res.data : n));
        toast.success('Notice updated successfully!');
      } else {
        const res = await API.post('/admin/notices', formData);
        setNotices([res.data, ...notices]);
        toast.success('Notice published successfully!');
      }
      setIsModalOpen(false);
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to save notice.';
      toast.error(typeof errMsg === 'string' ? errMsg : 'Validation error.');
    }
  };

  const handleTogglePublish = async (notice) => {
    try {
      const res = await API.put(`/admin/notices/${notice.id}`, { is_published: !notice.is_published });
      setNotices(notices.map(n => n.id === notice.id ? res.data : n));
      toast.success(`Notice ${!notice.is_published ? 'published' : 'unpublished'}`);
    } catch (err) {
      toast.error('Failed to update publication status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return;
    try {
      await API.delete(`/admin/notices/${id}`);
      setNotices(notices.filter(n => n.id !== id));
      toast.success('Notice deleted.');
    } catch (err) {
      toast.error('Failed to delete notice.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumbs & Back Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <Breadcrumbs items={[{ label: 'Admin', path: '/admin' }, { label: 'Campus Notices' }]} />
        <Link to="/admin" className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 transition">
          <ArrowLeft size={14} /> ← Back to Dashboard
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-800">Campus Notice Management</h1>
          <p className="text-xs text-slate-500">Publish, broadcast, and moderate campus announcements</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchNotices} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 transition">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={handleOpenCreate} className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition hover:from-amber-600 hover:to-amber-700">
            <Plus size={16} /> Create Notice
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-amber-500" size={32} /></div>
      ) : !notices.length ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 text-slate-400 font-medium">No notices currently published. Click 'Create Notice' to broadcast one!</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notices.map(n => (
            <div key={n.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full uppercase tracking-wider">{n.category || 'General'}</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${n.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                    {n.is_published ? 'Published' : 'Draft / Hidden'}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-slate-900 text-base mb-2">{n.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-3 mb-4">{n.content}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[11px] text-slate-400">Target: {n.target_audience}</span>
                <div className="flex gap-1">
                  <button onClick={() => handleTogglePublish(n)} className="p-2 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-50" title={n.is_published ? 'Unpublish' : 'Publish'}>
                    {n.is_published ? <XCircle size={16} /> : <CheckCircle size={16} />}
                  </button>
                  <button onClick={() => handleOpenEdit(n)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50" title="Edit">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(n.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-50" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100">
              <X size={20} />
            </button>
            <h2 className="text-2xl font-serif font-bold text-slate-900 mb-6">{editingNotice ? 'Edit Notice' : 'Create Campus Notice'}</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MCA Examination Schedule Released"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 outline-none"
                  >
                    {['Academic', 'Examination', 'Placement', 'General', 'Holiday', 'Event', 'Alumni', 'Other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Course *</label>
                  <select
                    required
                    value={formData.target_course}
                    onChange={e => setFormData({ ...formData, target_course: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 outline-none"
                  >
                    {['All Courses', 'MCA', 'MBA', 'MTech'].map(crs => (
                      <option key={crs} value={crs}>{crs}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience *</label>
                  <select
                    required
                    value={formData.target_audience}
                    onChange={e => setFormData({ ...formData, target_audience: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 outline-none"
                  >
                    {['All Students', 'Final Year Students', 'Students & Alumni', 'Faculty & Students', 'All'].map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Published Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.published_date}
                    onChange={e => setFormData({ ...formData, published_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Content *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter detailed notice content..."
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 outline-none"
                ></textarea>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={e => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <label htmlFor="is_published" className="text-xs font-bold text-slate-700 cursor-pointer">Publish immediately on landing page</label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold text-xs shadow-md">
                  {editingNotice ? 'Update Notice' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotices;
