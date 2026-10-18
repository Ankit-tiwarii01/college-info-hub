import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchJobs, fetchJobApplications, updateApplicationStatus } from '../../features/jobs/jobsSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, User, ChevronRight, Loader2, CheckCircle2, Clock, X, Trophy, MessageSquare, List, LayoutGrid, FileText } from 'lucide-react';
import { toast } from 'sonner';

const COLUMNS = [
  { id: 'Applied',      label: 'Applied',       color: 'bg-slate-100 text-slate-700',    dot: 'bg-slate-400' },
  { id: 'Shortlisted',  label: 'Shortlisted',   color: 'bg-amber-100 text-amber-800',    dot: 'bg-amber-500' },
  { id: 'Interviewing', label: 'Interviewing',  color: 'bg-blue-100 text-blue-800',      dot: 'bg-blue-500'  },
  { id: 'Rejected',     label: 'Rejected',      color: 'bg-rose-100 text-rose-700',      dot: 'bg-rose-400'  },
  { id: 'Hired',        label: 'Hired 🎉',      color: 'bg-emerald-100 text-emerald-800',dot: 'bg-emerald-500'},
];

const ApplicantKanban = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const { jobs, jobApplications, loading } = useSelector((state) => state.jobs);
  const [selectedJobId, setSelectedJobId] = useState(id ? (parseInt(id, 10) || id) : null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
  const [draggedApp, setDraggedApp] = useState(null);
  const [noteModal, setNoteModal]   = useState(null); // { appId, status }
  const [noteText, setNoteText]     = useState('');
  const [updating, setUpdating]     = useState(null);

  useEffect(() => { dispatch(fetchJobs()); }, [dispatch]);

  useEffect(() => {
    if (!selectedJobId && jobs && jobs.length > 0) {
      const targetId = id ? (parseInt(id, 10) || id) : jobs[0].id;
      setSelectedJobId(targetId);
    }
  }, [jobs, id, selectedJobId]);

  useEffect(() => {
    if (selectedJobId) dispatch(fetchJobApplications(selectedJobId));
  }, [selectedJobId, dispatch]);

  const applications = selectedJobId ? (jobApplications[selectedJobId] || []) : [];

  const appsForColumn = (colId) => applications.filter(a => a.status === colId);

  /* ── Drag handlers ── */
  const onDragStart = (app) => setDraggedApp(app);
  const onDrop = (colId) => {
    if (!draggedApp || draggedApp.status === colId) return;
    setNoteModal({ appId: draggedApp.id, status: colId });
    setDraggedApp(null);
  };

  /* ── Confirm status change ── */
  const confirmMove = async () => {
    if (!noteModal) return;
    setUpdating(noteModal.appId);
    try {
      await dispatch(updateApplicationStatus({
        applicationId: noteModal.appId,
        status: noteModal.status,
        note: noteText,
      })).unwrap();
      dispatch(fetchJobApplications(selectedJobId));
      toast.success(`Candidate status updated to ${noteModal.status}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
      setNoteModal(null);
      setNoteText('');
    }
  };

  return (
    <div className="max-w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-800">Applicant Tracker</h1>
          <p className="text-slate-500 mt-1">Review and manage student job applications for your open vacancies.</p>
        </div>
        
        {/* View Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-xs transition ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <List size={16} /> <span>List View</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-xs transition ${
              viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid size={16} /> <span>Kanban Stages</span>
          </button>
        </div>
      </div>

      {/* Job selector */}
      <div className="flex gap-3 flex-wrap mb-8">
        {loading && jobs.length === 0 ? (
          <Loader2 className="animate-spin text-amber-500" size={28} />
        ) : jobs.length === 0 ? (
          <p className="text-slate-500 font-medium">You haven't posted any open vacancies yet.</p>
        ) : (
          jobs.map(job => (
            <button
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                selectedJobId === job.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700'
              }`}
            >
              <Briefcase size={15} />
              {job.title} <span className="opacity-50 font-normal">— {job.company}</span>
            </button>
          ))
        )}
      </div>

      {!selectedJobId ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
          <Briefcase size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Select an open vacancy job to see student applicants</p>
        </div>
      ) : viewMode === 'table' ? (
        /* --- LIST TABLE VIEW --- */
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate Student</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cover Letter &amp; Portfolio</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Applied Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Current Stage</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Update Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-16 text-center text-slate-400 italic font-medium">
                      No applications received for this job position yet.
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => {
                    const candidateName = app.student?.name || `Student #${app.student_id}`;
                    return (
                      <tr key={app.id} className="hover:bg-amber-50/40 transition duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-bold text-sm flex items-center justify-center mr-3 shadow-md">
                              {candidateName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-base">{candidateName}</div>
                              <div className="text-xs text-slate-400 font-medium">{app.student?.email || ''}</div>
                              {app.student?.course && <div className="text-xs text-amber-600 font-semibold">{app.student.course}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            {app.cover_letter ? (
                              <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-lg italic border border-slate-100 mb-1">
                                "{app.cover_letter}"
                              </p>
                            ) : (
                              <span className="text-xs text-slate-400 italic block mb-1">No cover letter attached</span>
                            )}
                            {app.resume_url && (
                              <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-bold text-amber-600 hover:underline">
                                <FileText size={13} className="mr-1" /> View Portfolio / Resume Link
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                          {new Date(app.applied_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${
                            app.status === 'Hired' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            app.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            app.status === 'Interviewing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            app.status === 'Shortlisted' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <select 
                            value={app.status}
                            onChange={(e) => {
                              setNoteModal({ appId: app.id, status: e.target.value });
                            }}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm cursor-pointer"
                          >
                            <option value="Applied">Applied</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Interviewing">Interviewing</option>
                            <option value="Hired">Hired 🎉</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* --- KANBAN BOARD VIEW --- */
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 min-h-[400px]">
          {COLUMNS.map(col => (
            <div
              key={col.id}
              className="flex flex-col bg-slate-50/80 rounded-2xl border border-slate-200 overflow-hidden"
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(col.id)}
            >
              {/* Column header */}
              <div className={`flex items-center gap-2 px-4 py-3 border-b border-slate-200`}>
                <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                <span className={`text-xs font-extrabold uppercase tracking-widest`}>{col.label}</span>
                <span className="ml-auto text-xs font-bold bg-white border border-slate-200 rounded-full px-2 py-0.5 text-slate-500">
                  {appsForColumn(col.id).length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[480px]">
                <AnimatePresence>
                  {appsForColumn(col.id).map(app => (
                    <motion.div
                      key={app.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      draggable
                      onDragStart={() => onDragStart(app)}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:border-amber-200 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
                          <User size={16} className="text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">
                            {app.student?.name || `Applicant #${app.id}`}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{app.student?.email || ''}</p>
                        </div>
                      </div>
                      {app.cover_letter && (
                        <p className="text-xs text-slate-500 mt-3 line-clamp-2 bg-slate-50 rounded-lg p-2 italic">
                          "{app.cover_letter}"
                        </p>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {appsForColumn(col.id).length === 0 && (
                  <div className="h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs font-bold">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Move + Note Modal */}
      <AnimatePresence>
        {noteModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif font-bold text-lg text-slate-800">
                  Move to <span className="text-amber-600">{noteModal.status}</span>
                </h3>
                <button onClick={() => setNoteModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <textarea
                placeholder="Add a note for this status change (optional)..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 resize-none outline-none mb-4"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setNoteModal(null)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button
                  onClick={confirmMove}
                  disabled={!!updating}
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-black transition flex items-center gap-2 shadow-lg"
                >
                  {updating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Confirm Move
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApplicantKanban;
