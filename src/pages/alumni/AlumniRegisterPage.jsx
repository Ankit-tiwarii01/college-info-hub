import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  GraduationCap, User, Briefcase, MapPin, Share2, HeartHandshake, Upload, X, Check, AlertCircle, Loader2, CheckCircle2, ArrowLeft 
} from 'lucide-react';
import API from '../../services/api';
import Breadcrumbs from '../../components/Breadcrumbs';

/*
// ===== FIELDS 9 & 10 (TEMPORARILY COMMENTED OUT FOR FUTURE USE) =====
const UNIVERSITY_INSTITUTES = [
  "School of Information Technology",
  "School of Management Studies",
  "School of Engineering & Technology",
  "School of Applied Sciences",
  "School of Humanities & Social Sciences",
  "School of Legal Studies",
  "Institute of Technology & Science",
  "Institute of Professional Studies",
  "College of Engineering",
  "Any Other"
];
// ===== END FIELDS 9 & 10 =====
*/

// STRICT RULE: ONLY MCA, MBA, MTech allowed
const ALLOWED_COURSES = ["MCA", "MBA", "MTech"];

// STRICT RULE: EXACT 8 PROFESSIONS ONLY
const PROFESSIONS = [
  "Government Service",
  "Private Service",
  "Public Sector Undertaking Service",
  "Business/Entrepreneur",
  "Self-Employed",
  "Home Maker",
  "Studying",
  "Unemployed"
];

// STRICT RULE: CONTRIBUTION OPTIONS
const CONTRIBUTION_OPTIONS = [
  "Financially (Individual)",
  "Financially (As a batch)",
  "Placements",
  "Services",
  "Unable to Contribute",
  "Other"
];

const AlumniRegisterPage = () => {
  const navigate = useNavigate();

  // Dynamic Year Calculation Formula:
  // 2004 <= admissionYear <= currentYear - 2
  // admissionYear + 2 <= completionYear <= currentYear
  const currentYear = new Date().getFullYear();
  const minAdmissionYear = 2004;
  const maxAdmissionYear = currentYear - 2; // For 2026: 2024

  // ── Form State ─────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: '',
    enrollment_number: '',
    mobile_number: '',
    email: '',
    password: '',
    confirm_password: '',
    date_of_birth: '',
    course_completed: 'MCA',
    year_of_admission: maxAdmissionYear.toString(), // Default e.g. 2024
    year_of_completion: (maxAdmissionYear + 2).toString(), // Default e.g. 2026
    university_institute: 'NA',
    other_institution: 'NA',
    profession: 'Private Service',
    designation: '',
    organization: '',
    current_city: '',
    current_state: '',
    current_country: 'India',
    linkedin: '',
    facebook: '',
    instagram: '',
    x_twitter: '',
    youtube: '',
    willing_to_attend_events: 'Yes',
    contributions: [],
    other_contribution_specify: '',
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Dynamic minimum and maximum completion years derived from selected admission year
  const admYearNum = parseInt(formData.year_of_admission) || maxAdmissionYear;
  const minCompletionYear = admYearNum + 2;
  const maxCompletionYear = currentYear;

  // ── Handlers ───────────────────────────────────────────────────────────────

  /*
  // ===== FIELDS 9 & 10 HANDLER (COMMENTED OUT FOR FUTURE USE) =====
  const handleInstituteChange = (e) => {
    const value = e.target.value;
    if (value === "Any Other") {
      setFormData(prev => ({ ...prev, university_institute: value, other_institution: '' }));
    } else {
      setFormData(prev => ({ ...prev, university_institute: value, other_institution: 'NA' }));
    }
  };
  // ===== END FIELDS 9 & 10 HANDLER =====
  */

  const handleProfessionChange = (e) => {
    const value = e.target.value;
    if (value === "Home Maker" || value === "Unemployed") {
      setFormData(prev => ({ ...prev, profession: value, designation: 'NA', organization: 'NA' }));
    } else {
      setFormData(prev => ({
        ...prev,
        profession: value,
        designation: prev.designation === 'NA' ? '' : prev.designation,
        organization: prev.organization === 'NA' ? '' : prev.organization
      }));
    }
  };

  const handleContributionToggle = (option) => {
    let current = [...formData.contributions];
    if (option === "Unable to Contribute") {
      current = ["Unable to Contribute"];
    } else {
      current = current.filter(c => c !== "Unable to Contribute");
      if (current.includes(option)) {
        current = current.filter(c => c !== option);
      } else {
        current.push(option);
      }
    }
    setFormData(prev => ({ ...prev, contributions: current }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageError('');
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      setImageError('Invalid image format. Please select JPG, PNG, or WebP.');
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      setImageError('Image file size exceeds maximum allowed size of 1 MB.');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError('');
  };

  // ── Client-side Validation ─────────────────────────────────────────────────

  const validateForm = () => {
    if (formData.password !== formData.confirm_password) return 'Passwords do not match.';
    if (!formData.name.trim()) return 'Name is required.';
    if (!formData.enrollment_number.trim()) return 'University Enrollment Number is required.';
    
    // Mobile Validation (India 10 digits or International with country code)
    const mobileRegex = /^(?:\+?\d{1,4}[-.\s]?)?\d{10}$/;
    if (!mobileRegex.test(formData.mobile_number.trim())) {
      return 'Please enter a valid mobile number.';
    }

    // Email Validation
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(formData.email.trim().toLowerCase())) {
      return 'Please enter a valid email address.';
    }

    if (!formData.date_of_birth) return 'Date of Birth is required.';

    // Course Validation
    if (!ALLOWED_COURSES.includes(formData.course_completed)) {
      return 'Please select a course.';
    }

    // Dynamic Admission & Completion Year Validation
    // Formula: 2004 <= admissionYear <= currentYear - 2
    //          admissionYear + 2 <= completionYear <= currentYear
    const admYear = parseInt(formData.year_of_admission);
    const compYear = parseInt(formData.year_of_completion);
    
    if (isNaN(admYear)) return 'Please enter the year of admission.';
    if (admYear < minAdmissionYear || admYear > maxAdmissionYear) {
      return `Year of Admission must be between ${minAdmissionYear} and ${maxAdmissionYear}.`;
    }

    if (isNaN(compYear)) return 'Please enter the year of completion.';
    const reqMinComp = admYear + 2;
    if (compYear < reqMinComp || compYear > maxCompletionYear) {
      return `For Admission Year ${admYear}, Completion Year must be between ${reqMinComp} and ${maxCompletionYear}.`;
    }

    // Profession dependent checks
    if (!formData.profession) return 'Please select your profession.';
    if (formData.profession !== "Home Maker" && formData.profession !== "Unemployed") {
      if (formData.profession === "Studying" && (!formData.designation.trim() || formData.designation === 'NA')) {
        return 'Please specify the degree currently being pursued under Designation.';
      }
      if (!formData.designation.trim() || formData.designation === 'NA') {
        return `Designation is required for profession '${formData.profession}'.`;
      }
      if (!formData.organization.trim() || formData.organization === 'NA') {
        return `Organization/Institution name is required for profession '${formData.profession}'.`;
      }
    }

    if (!formData.current_city.trim()) return 'Current City of Residence is required.';
    if (!formData.current_state.trim()) return 'Current State of Residence is required.';
    if (!formData.current_country.trim()) return 'Current Country of Residence is required.';

    if (!formData.willing_to_attend_events) return 'Please select whether you are willing to attend future alumni events.';
    if (formData.contributions.length === 0) return 'Please select at least one contribution option.';
    if (formData.contributions.includes("Other") && !formData.other_contribution_specify.trim()) {
      return 'Please specify your contribution details under "Please specify".';
    }

    // Social Media URL validation (Optional fields)
    const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
    for (const [key, val] of Object.entries({
      LinkedIn: formData.linkedin,
      Facebook: formData.facebook,
      Instagram: formData.instagram,
      X: formData.x_twitter,
      YouTube: formData.youtube
    })) {
      if (val && val.trim()) {
        let formatted = val.trim();
        if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) formatted = 'https://' + formatted;
        if (!urlRegex.test(formatted)) return `Please enter a valid URL for ${key}.`;
      }
    }

    return null;
  };

  // ── Form Submission ────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const valErr = validateForm();
    if (valErr) {
      setErrorMsg(valErr);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.name.trim());
      data.append('enrollment_number', formData.enrollment_number.trim());
      data.append('mobile_number', formData.mobile_number.trim());
      data.append('email', formData.email.trim().toLowerCase());
      data.append('password', formData.password);
      data.append('confirm_password', formData.confirm_password);
      data.append('date_of_birth', formData.date_of_birth);
      data.append('course_completed', formData.course_completed);
      data.append('year_of_admission', formData.year_of_admission.toString());
      data.append('year_of_completion', formData.year_of_completion.toString());
      data.append('university_institute', 'NA');
      data.append('other_institution', 'NA');
      data.append('profession', formData.profession);
      data.append('designation', formData.designation);
      data.append('organization', formData.organization);
      data.append('current_city', formData.current_city.trim());
      data.append('current_state', formData.current_state.trim());
      data.append('current_country', formData.current_country.trim());
      data.append('willing_to_attend_events', formData.willing_to_attend_events);
      data.append('contributions', formData.contributions.join(','));
      data.append('other_contribution_specify', formData.other_contribution_specify);

      if (formData.linkedin) data.append('linkedin', formData.linkedin.trim());
      if (formData.facebook) data.append('facebook', formData.facebook.trim());
      if (formData.instagram) data.append('instagram', formData.instagram.trim());
      if (formData.x_twitter) data.append('x_twitter', formData.x_twitter.trim());
      if (formData.youtube) data.append('youtube', formData.youtube.trim());

      if (imageFile) {
        data.append('professional_picture', imageFile);
      }

      await API.post('/api/alumni/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate(`/verify-email?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Registration failed. An alumni record with this email or enrollment number may already exist.';
      setErrorMsg(detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  // ── Success State ──────────────────────────────────────────────────────────

  if (submittedSuccess) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6 bg-gradient-to-b from-amber-50/50 to-white">
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-lg text-center border border-slate-100">
          <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
            <CheckCircle2 size={44} />
          </div>
          <h2 className="text-3xl font-serif font-bold text-slate-900 mb-3">Welcome to the Alumni Directory!</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Your alumni account is ready. Sign in with your email and password to share posts with the community.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/" className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl shadow-lg hover:from-amber-600 hover:to-amber-700 transition text-center">
              Return to Landing Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleBackToHome = () => {
    const isDirty = Boolean(
      formData.name || formData.enrollment_number || formData.mobile_number || formData.email || formData.date_of_birth
    );
    if (isDirty) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        return;
      }
    }
    navigate('/');
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ── Form Render ────────────────────────────────────────────────────────────

  const isHomeMakerOrUnemployed = formData.profession === "Home Maker" || formData.profession === "Unemployed";

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-6">
          <Breadcrumbs items={[{ label: 'Alumni Registration' }]} />
        </div>

        {/* Header Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-2xl shadow-xl shadow-amber-500/20 mb-4">
            <GraduationCap size={36} />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-extrabold text-slate-900 mb-2">
            Alumni Registration
          </h1>
          <p className="text-lg text-amber-800 font-medium">
            Register in the Alumni Directory
          </p>
        </div>

        {/* Section Navigation Tabs for Long Form */}
        <div className="sticky top-20 z-40 bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-sm mb-8 overflow-x-auto">
          <div className="flex items-center justify-start sm:justify-center gap-2 text-xs font-bold text-slate-600 min-w-max">
            <button type="button" onClick={() => scrollToSection('section-personal')} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl transition">1. Personal</button>
            <button type="button" onClick={() => scrollToSection('section-academic')} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl transition">2. Academic</button>
            <button type="button" onClick={() => scrollToSection('section-professional')} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl transition">3. Professional</button>
            <button type="button" onClick={() => scrollToSection('section-residence')} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl transition">4. Residence</button>
            <button type="button" onClick={() => scrollToSection('section-picture')} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl transition">5. Picture</button>
            <button type="button" onClick={() => scrollToSection('section-social')} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl transition">6. Social</button>
            <button type="button" onClick={() => scrollToSection('section-engagement')} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl transition">7. Engagement</button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm flex items-start gap-3 shadow-sm">
            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-900">Registration Error</h4>
              <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h2 className="font-bold text-xl">Create your alumni login</h2>
            {['password', 'confirm_password'].map(field => (
              <label key={field} className="block">
                {field === 'password' ? 'Password' : 'Confirm password'}
                <input className="block w-full border rounded-lg p-3" type="password" minLength={8} required
                  autoComplete="new-password" value={formData[field]}
                  onChange={e => setFormData({...formData, [field]: e.target.value})} />
              </label>
            ))}
            <p className="text-sm">Use at least 8 characters. You can sign in after registration.</p>
          </section>
          
          {/* SECTION 1: Personal Information */}
          <div id="section-personal" className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                <User size={20} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-slate-800">Personal Information</h3>
                <p className="text-xs text-slate-400">Basic contact and identity details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              <div className="flex flex-col">
                <label className="block text-sm font-bold text-slate-700 mb-2">1. Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Given Name Middle Name Last Name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                />
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-bold text-slate-700 mb-2">2. University Enrollment Number *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter enrollment number"
                  value={formData.enrollment_number}
                  onChange={e => setFormData({ ...formData, enrollment_number: e.target.value })}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                />
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-bold text-slate-700 mb-2">3. Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="For India: 10 digits | Outside India: country code"
                  value={formData.mobile_number}
                  onChange={e => setFormData({ ...formData, mobile_number: e.target.value })}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                />
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-bold text-slate-700 mb-2">4. Email ID *</label>
                <input
                  type="email"
                  required
                  placeholder="alumni@example.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                />
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-bold text-slate-700 mb-2">5. Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={formData.date_of_birth}
                  onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                />
              </div>
            </div>
          </div>


          {/* SECTION 2: Academic Information (Consistent 3-Column Grid) */}
          <div id="section-academic" className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                <GraduationCap size={20} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-slate-800">Academic Information</h3>
                <p className="text-xs text-slate-400">Course and academic details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Field 6: Course Completed */}
              <div className="flex flex-col">
                <label className="block text-sm font-bold text-slate-700 mb-1">6. Course Completed *</label>
                <div className="h-5 flex items-center mb-2">
                  <span className="text-xs text-slate-400">(Allowed: MCA, MBA, MTech)</span>
                </div>
                <select
                  value={formData.course_completed}
                  onChange={e => setFormData({ ...formData, course_completed: e.target.value })}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                >
                  {ALLOWED_COURSES.map((course) => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              {/* Field 7: Year of Admission */}
              <div className="flex flex-col">
                <label className="block text-sm font-bold text-slate-700 mb-1">7. Year of Admission *</label>
                <div className="h-5 flex items-center mb-2">
                  <span className="text-xs text-slate-400">({minAdmissionYear}–{maxAdmissionYear})</span>
                </div>
                <input
                  type="number"
                  required
                  min={minAdmissionYear}
                  max={maxAdmissionYear}
                  placeholder={`e.g. ${maxAdmissionYear}`}
                  value={formData.year_of_admission}
                  onChange={e => {
                    const val = e.target.value;
                    const valNum = parseInt(val);
                    setFormData(prev => {
                      let updatedComp = prev.year_of_completion;
                      if (!isNaN(valNum)) {
                        const reqMinComp = valNum + 2;
                        const currentCompNum = parseInt(prev.year_of_completion);
                        if (isNaN(currentCompNum) || currentCompNum < reqMinComp) {
                          updatedComp = reqMinComp.toString();
                        } else if (currentCompNum > currentYear) {
                          updatedComp = currentYear.toString();
                        }
                      }
                      return { ...prev, year_of_admission: val, year_of_completion: updatedComp };
                    });
                  }}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                />
              </div>

              {/* Field 8: Year of Completion */}
              <div className="flex flex-col">
                <label className="block text-sm font-bold text-slate-700 mb-1">8. Year of Completion *</label>
                <div className="h-5 flex items-center mb-2">
                  <span className="text-xs text-slate-400">({minCompletionYear}–{maxCompletionYear})</span>
                </div>
                <input
                  type="number"
                  required
                  min={minCompletionYear}
                  max={maxCompletionYear}
                  placeholder={`e.g. ${minCompletionYear}`}
                  value={formData.year_of_completion}
                  onChange={e => setFormData({ ...formData, year_of_completion: e.target.value })}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                />
              </div>

              {/* 
              // ===== FIELDS 9 & 10 (TEMPORARILY COMMENTED OUT FOR FUTURE USE) =====
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">9. University School/Centre/Affiliated Institute *</label>
                <select
                  value={formData.university_institute}
                  onChange={handleInstituteChange}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                >
                  {UNIVERSITY_INSTITUTES.map((inst) => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">10. Any Other Institution *</label>
                <input
                  type="text"
                  disabled={!isAnyOtherInstitute}
                  required={isAnyOtherInstitute}
                  placeholder={isAnyOtherInstitute ? "Enter full institution name" : "NA"}
                  value={formData.other_institution}
                  onChange={e => setFormData({ ...formData, other_institution: e.target.value })}
                  className="w-full h-12 rounded-xl border px-3.5 font-medium transition outline-none"
                />
              </div>
              // ===== END FIELDS 9 & 10 =====
              */}

            </div>
          </div>


          {/* SECTION 3: Professional Information (Equal-Width 3-Column Grid) */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                <Briefcase size={20} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-slate-800">Professional Information</h3>
                <p className="text-xs text-slate-400">Current employment status and details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">11. Profession *</label>
                <select
                  value={formData.profession}
                  onChange={handleProfessionChange}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                >
                  {PROFESSIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">12. Designation *</label>
                <input
                  type="text"
                  disabled={isHomeMakerOrUnemployed}
                  required={!isHomeMakerOrUnemployed}
                  placeholder={
                    isHomeMakerOrUnemployed 
                      ? "NA" 
                      : formData.profession === "Studying" 
                      ? "Enter degree currently pursued" 
                      : "Current Designation"
                  }
                  value={formData.designation}
                  onChange={e => setFormData({ ...formData, designation: e.target.value })}
                  className={`w-full h-12 rounded-xl border px-3.5 font-medium transition outline-none ${
                    isHomeMakerOrUnemployed 
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'border-slate-200 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">13. Name of Organization/Institution *</label>
                <input
                  type="text"
                  disabled={isHomeMakerOrUnemployed}
                  required={!isHomeMakerOrUnemployed}
                  placeholder={isHomeMakerOrUnemployed ? "NA" : "Organization or University Name"}
                  value={formData.organization}
                  onChange={e => setFormData({ ...formData, organization: e.target.value })}
                  className={`w-full h-12 rounded-xl border px-3.5 font-medium transition outline-none ${
                    isHomeMakerOrUnemployed 
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'border-slate-200 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                  }`}
                />
              </div>
            </div>
          </div>


          {/* SECTION 4: Residence (Equal-Width 3-Column Grid) */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                <MapPin size={20} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-slate-800">Residence</h3>
                <p className="text-xs text-slate-400">Current place of living</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">14. Current City of Residence *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Delhi, Noida, Mumbai"
                  value={formData.current_city}
                  onChange={e => setFormData({ ...formData, current_city: e.target.value })}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">15. Current State of Residence *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delhi, Uttar Pradesh, California"
                  value={formData.current_state}
                  onChange={e => setFormData({ ...formData, current_state: e.target.value })}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">16. Current Country of Residence *</label>
                <input
                  type="text"
                  required
                  placeholder="India"
                  value={formData.current_country}
                  onChange={e => setFormData({ ...formData, current_country: e.target.value })}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 font-medium text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                />
              </div>
            </div>
          </div>


          {/* SECTION 5: Professional & Social Information */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                <Share2 size={20} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-slate-800">Professional & Social Information</h3>
                <p className="text-xs text-slate-400">Upload profile photo and social links (Optional)</p>
              </div>
            </div>

            {/* Photo Upload */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-2">17. Latest Professional Picture</label>
              <p className="text-xs text-slate-400 mb-3">Accepted formats: JPG, JPEG, PNG, WebP. Maximum file size: 1 MB. (Optional)</p>
              
              {imageError && (
                <p className="text-xs text-red-600 font-bold mb-3 bg-red-50 p-2 rounded-lg">{imageError}</p>
              )}

              {imagePreview ? (
                <div className="flex items-center gap-4 p-4 border border-amber-200 bg-amber-50/40 rounded-2xl max-w-md">
                  <img src={imagePreview} alt="Preview" className="h-16 w-16 rounded-xl object-cover ring-2 ring-amber-400" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{imageFile?.name}</p>
                    <p className="text-[10px] text-slate-500">{(imageFile?.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition"
                    title="Remove Image"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/30 rounded-2xl p-6 cursor-pointer transition text-center max-w-md">
                  <Upload size={28} className="text-amber-500 mb-2" />
                  <span className="text-sm font-bold text-slate-700">Click to upload professional picture</span>
                  <span className="text-xs text-slate-400 mt-1">JPG, JPEG, PNG, WebP (Max 1MB)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            {/* Social Media Links */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">18. Social Media Profile Links</label>
              <p className="text-xs text-slate-400 mb-4">Provide profile/channel links you wish to share (Optional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 mb-1 block">LinkedIn</span>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={formData.linkedin}
                    onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-medium text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition"
                  />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 mb-1 block">Facebook</span>
                  <input
                    type="url"
                    placeholder="https://facebook.com/username"
                    value={formData.facebook}
                    onChange={e => setFormData({ ...formData, facebook: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-medium text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition"
                  />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 mb-1 block">Instagram</span>
                  <input
                    type="url"
                    placeholder="https://instagram.com/username"
                    value={formData.instagram}
                    onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-medium text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition"
                  />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 mb-1 block">X</span>
                  <input
                    type="url"
                    placeholder="https://x.com/username"
                    value={formData.x_twitter}
                    onChange={e => setFormData({ ...formData, x_twitter: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-medium text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition"
                  />
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs font-bold text-slate-500 mb-1 block">YouTube</span>
                  <input
                    type="url"
                    placeholder="https://youtube.com/@channel"
                    value={formData.youtube}
                    onChange={e => setFormData({ ...formData, youtube: e.target.value })}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-medium text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>


          {/* SECTION 6: Alumni Engagement */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                <HeartHandshake size={20} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-slate-800">Alumni Engagement</h3>
                <p className="text-xs text-slate-400">Events participation and college support</p>
              </div>
            </div>

            {/* Event Attendance */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-3">19. Willingness to Attend Future Alumni Events *</label>
              <div className="flex gap-6">
                {['Yes', 'No'].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="willing_to_attend_events"
                      value={opt}
                      checked={formData.willing_to_attend_events === opt}
                      onChange={e => setFormData({ ...formData, willing_to_attend_events: e.target.value })}
                      className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Contribution Options */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">20. Contribution to College *</label>
              <p className="text-xs text-slate-400 mb-4">Select one or more options. Selecting 'Unable to Contribute' deselects other choices.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {CONTRIBUTION_OPTIONS.map((opt) => {
                  const isChecked = formData.contributions.includes(opt);
                  return (
                    <label
                      key={opt}
                      onClick={() => handleContributionToggle(opt)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                        isChecked
                          ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold shadow-sm'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700 font-medium'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                        isChecked ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isChecked && <Check size={14} />}
                      </div>
                      <span className="text-sm">{opt}</span>
                    </label>
                  );
                })}
              </div>

              {/* Other specify text field */}
              {formData.contributions.includes("Other") && (
                <div className="mt-4 p-4 bg-amber-50/60 border border-amber-200 rounded-2xl">
                  <label className="block text-xs font-bold text-amber-900 mb-1.5">Please specify *</label>
                  <input
                    type="text"
                    required
                    placeholder="Describe how you wish to contribute to the college"
                    value={formData.other_contribution_specify}
                    onChange={e => setFormData({ ...formData, other_contribution_specify: e.target.value })}
                    className="w-full h-11 rounded-xl border border-amber-300 bg-white px-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-lg shadow-xl shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 flex justify-center items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={22} />
                  <span>Submitting Alumni Registration...</span>
                </>
              ) : (
                <>
                  <Check size={22} />
                  <span>Submit Alumni Registration</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default AlumniRegisterPage;
