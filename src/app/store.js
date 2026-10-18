import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import postsReducer from '../features/posts/postsSlice';
import jobsReducer from '../features/jobs/jobsSlice';
import mentorshipReducer from '../features/mentorship/mentorshipSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    posts: postsReducer,
    jobs: jobsReducer,
    mentorship: mentorshipReducer,
  },
});
