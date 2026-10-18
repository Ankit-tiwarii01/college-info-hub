import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../services/api';

export const fetchJobs = createAsyncThunk('jobs/fetchJobs', async (_, { rejectWithValue }) => {
  try {
    const response = await API.get('/jobs/');
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to fetch jobs');
  }
});

export const createJob = createAsyncThunk('jobs/createJob', async (jobData, { rejectWithValue }) => {
  try {
    const response = await API.post('/jobs/', jobData);
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to create job');
  }
});

export const fetchMyPostedJobs = createAsyncThunk('jobs/fetchMyPostedJobs', async (_, { rejectWithValue }) => {
  try {
    const response = await API.get('/jobs/my/posts');
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to fetch submitted jobs');
  }
});

export const fetchJobById = createAsyncThunk('jobs/fetchById', async (id, { rejectWithValue }) => {
  try {
    const response = await API.get(`/jobs/${id}`);
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to fetch job');
  }
});

export const deleteJob = createAsyncThunk('jobs/deleteJob', async (jobId, { rejectWithValue }) => {
  try {
    await API.delete(`/jobs/${jobId}`);
    return jobId;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to delete job');
  }
});

// Student: fetch all their own applications
export const fetchMyApplications = createAsyncThunk('jobs/fetchMyApplications', async (_, { rejectWithValue }) => {
  try {
    const response = await API.get('/jobs/my/applications');
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to fetch applications');
  }
});

// Alumni: fetch all applicants for a specific job they posted
export const fetchJobApplications = createAsyncThunk('jobs/fetchJobApplications', async (jobId, { rejectWithValue }) => {
  try {
    const response = await API.get(`/jobs/${jobId}/applications`);
    return { jobId, applications: response.data };
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to fetch applicants');
  }
});

// Alumni: update a candidate's application status
export const updateApplicationStatus = createAsyncThunk('jobs/updateApplicationStatus', async ({ applicationId, status, note }, { rejectWithValue }) => {
  try {
    const response = await API.put(`/jobs/applications/${applicationId}/status`, { status, note });
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to update status');
  }
});

const initialState = {
  jobs: [],
  currentJob: null,
  myApplications: [],
  myPostedJobs: [],
  jobApplications: {},
  loading: false,
  error: null,
};

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => { state.loading = true; })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = action.payload;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchJobById.pending, (state) => {
        state.loading = true; state.error = null; state.currentJob = null;
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.loading = false; state.currentJob = action.payload;
      })
      .addCase(fetchJobById.rejected, (state, action) => {
        state.loading = false; state.error = action.payload;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.jobs.unshift(action.payload);
        state.myPostedJobs.unshift(action.payload);
      })
      .addCase(fetchMyPostedJobs.fulfilled, (state, action) => {
        state.myPostedJobs = action.payload;
      })
      .addCase(deleteJob.fulfilled, (state, action) => {
        state.jobs = state.jobs.filter(job => job.id !== action.payload);
      })
      .addCase(fetchMyApplications.fulfilled, (state, action) => {
        state.myApplications = action.payload;
      })
      .addCase(fetchJobApplications.fulfilled, (state, action) => {
        state.jobApplications[action.payload.jobId] = action.payload.applications;
      })
      .addCase(updateApplicationStatus.fulfilled, (state, action) => {
        const idx = state.myApplications.findIndex(a => a.id === action.payload.id);
        if (idx !== -1) state.myApplications[idx] = action.payload;
        for (const jobId in state.jobApplications) {
          const appIdx = state.jobApplications[jobId].findIndex(a => a.id === action.payload.id);
          if (appIdx !== -1) state.jobApplications[jobId][appIdx] = action.payload;
        }
      });
  },
});

export default jobsSlice.reducer;
