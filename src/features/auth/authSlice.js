import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../services/api';

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const loginUser = createAsyncThunk(
  'auth/login',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await API.post('/auth/token', userData);
      return response.data;
    } catch (err) {
      const message =
        err.response?.data?.detail || err.message || 'Login failed. Please try again.';
      return rejectWithValue(message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await API.post('/auth/register', userData);
      return response.data;
    } catch (err) {
      const message =
        err.response?.data?.detail || err.message || 'Registration failed. Please try again.';
      return rejectWithValue(message);
    }
  }
);

export const fetchProfile = createAsyncThunk(
  'auth/profile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await API.get('/users/me');
      return response.data;
    } catch (err) {
      const message =
        err.response?.data?.detail || err.message || 'Failed to fetch profile.';
      return rejectWithValue(message);
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await API.put('/users/me', userData);
      return response.data;
    } catch (err) {
      const message =
        err.response?.data?.detail || err.message || 'Failed to update profile.';
      return rejectWithValue(message);
    }
  }
);

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
  user: null,
  token: localStorage.getItem('token') || null,
  role: localStorage.getItem('role') || null,
  userId: localStorage.getItem('userId') ? Number(localStorage.getItem('userId')) : null,
  loading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('token'),
  isInitialized: !localStorage.getItem('token'),
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
      state.user = null;
      state.token = null;
      state.role = null;
      state.userId = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Login ──────────────────────────────────────────────────────────────
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.access_token;
        state.role = action.payload.role?.toLowerCase() ?? null;
        state.userId = action.payload.id ?? null;
        state.isAuthenticated = true;
        state.isInitialized = true;
        localStorage.setItem('token', action.payload.access_token);
        localStorage.setItem('role', action.payload.role?.toLowerCase() ?? '');
        localStorage.setItem('userId', action.payload.id ?? '');
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // ── Register ───────────────────────────────────────────────────────────
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.access_token) {
          state.token = action.payload.access_token;
          state.role = action.payload.role?.toLowerCase() ?? null;
          state.userId = action.payload.id ?? null;
          state.isAuthenticated = true;
          state.isInitialized = true;
          localStorage.setItem('token', action.payload.access_token);
          localStorage.setItem('role', action.payload.role?.toLowerCase() ?? '');
          localStorage.setItem('userId', action.payload.id ?? '');
        }
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // ── Fetch Profile ──────────────────────────────────────────────────────
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isInitialized = true;
        state.role = action.payload.role
          ? action.payload.role.toLowerCase()
          : state.role;
        state.userId = action.payload.id ?? state.userId;
        if (state.role) localStorage.setItem('role', state.role);
        if (state.userId) localStorage.setItem('userId', state.userId);
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.role = null;
        state.userId = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
      })
      // ── Update Profile ─────────────────────────────────────────────────────
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
