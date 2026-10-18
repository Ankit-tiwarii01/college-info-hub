import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../services/api';

export const fetchRequests = createAsyncThunk('mentorship/fetchRequests', async (_, { rejectWithValue }) => {
  try {
    const response = await API.get('/mentorship/requests');
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response.data.detail || 'Failed to fetch requests');
  }
});

export const requestMentorship = createAsyncThunk('mentorship/request', async (data, { rejectWithValue }) => {
  try {
    const response = await API.post('/mentorship/request', data);
    return response.data;
  } catch (err) {
      return rejectWithValue(err.response.data.detail || 'Failed to request mentorship');
  }
});

export const fetchMentors = createAsyncThunk('mentorship/fetchMentors', async (_, { rejectWithValue }) => {
  try {
    const response = await API.get('/mentorship/mentors');
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response.data.detail || 'Failed to fetch mentors');
  }
});

export const fetchMentorById = createAsyncThunk('mentorship/fetchById', async (id, { rejectWithValue }) => {
    try {
        const response = await API.get(`/users/${id}`);
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.detail || 'Failed to fetch mentor');
    }
});

export const fetchIncomingRequests = createAsyncThunk('mentorship/fetchIncoming', async (_, { rejectWithValue }) => {
    try {
        const response = await API.get('/mentorship/requests/incoming');
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response.data.detail || 'Failed to fetch incoming requests');
    }
});

export const updateRequestStatus = createAsyncThunk('mentorship/updateStatus', async ({ id, status, notes }, { rejectWithValue }) => {
    try {
        const response = await API.put(`/mentorship/requests/${id}`, { status, notes });
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.detail || 'Failed to update status');
    }
});

// ── Session Thunks ─────────────────────────────────────────────────────────────

export const scheduleSession = createAsyncThunk('mentorship/scheduleSession', async (data, { rejectWithValue }) => {
    try {
        const response = await API.post('/mentorship/sessions', data);
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.detail || 'Failed to schedule session');
    }
});

export const fetchSessionsForRequest = createAsyncThunk('mentorship/fetchSessions', async (requestId, { rejectWithValue }) => {
    try {
        const response = await API.get(`/mentorship/sessions?request_id=${requestId}`);
        return { requestId, sessions: response.data };
    } catch (err) {
        return rejectWithValue(err.response?.data?.detail || 'Failed to fetch sessions');
    }
});

export const updateSession = createAsyncThunk('mentorship/updateSession', async ({ id, ...data }, { rejectWithValue }) => {
    try {
        const response = await API.put(`/mentorship/sessions/${id}`, data);
        return response.data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.detail || 'Failed to update session');
    }
});

const initialState = {
  requests: [],
  incomingRequests: [],
  mentors: [],
  currentMentor: null,
  sessions: {},   // Keyed by requestId: { [requestId]: [session, ...] }
  loading: false,
  error: null,
};

const mentorshipSlice = createSlice({
  name: 'mentorship',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
        .addCase(fetchRequests.fulfilled, (state, action) => {
            state.requests = action.payload;
            state.loading = false;
        })
        .addCase(requestMentorship.fulfilled, (state, action) => {
            state.requests.push(action.payload);
        })
        .addCase(fetchMentors.fulfilled, (state, action) => {
            state.mentors = action.payload;
        })
        .addCase(fetchMentorById.pending, (state) => {
            state.loading = true;
            state.error = null;
            state.currentMentor = null;
        })
        .addCase(fetchMentorById.fulfilled, (state, action) => {
            state.loading = false;
            state.currentMentor = action.payload;
        })
        .addCase(fetchMentorById.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload;
        })
        // Incoming Requests (Alumni)
        .addCase(fetchIncomingRequests.fulfilled, (state, action) => {
            state.incomingRequests = action.payload;
        })
        .addCase(updateRequestStatus.fulfilled, (state, action) => {
            const index = state.incomingRequests.findIndex(r => r.id === action.payload.id);
            if (index !== -1) {
                state.incomingRequests[index] = action.payload;
            }
             const outIndex = state.requests.findIndex(r => r.id === action.payload.id);
             if (outIndex !== -1) {
                 state.requests[outIndex] = action.payload;
             }
        })
        // Sessions
        .addCase(scheduleSession.fulfilled, (state, action) => {
            const session = action.payload;
            if (!state.sessions[session.request_id]) {
                state.sessions[session.request_id] = [];
            }
            state.sessions[session.request_id].push(session);
        })
        .addCase(fetchSessionsForRequest.fulfilled, (state, action) => {
            state.sessions[action.payload.requestId] = action.payload.sessions;
        })
        .addCase(updateSession.fulfilled, (state, action) => {
            const updated = action.payload;
            const reqSessions = state.sessions[updated.request_id];
            if (reqSessions) {
                const idx = reqSessions.findIndex(s => s.id === updated.id);
                if (idx !== -1) reqSessions[idx] = updated;
            }
        });
  },
});

export default mentorshipSlice.reducer;
