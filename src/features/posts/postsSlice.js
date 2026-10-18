import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../services/api';

export const fetchPosts = createAsyncThunk('posts/fetchPosts', async (_, { rejectWithValue }) => {
  try {
    const response = await API.get('/posts/');
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to fetch posts'); 
  }
});

export const createPost = createAsyncThunk('posts/createPost', async (postData, { rejectWithValue }) => {
  try {
    const response = await API.post('/posts/', postData);
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to create post');
  }
});

export const likePost = createAsyncThunk('posts/likePost', async (postId, { rejectWithValue, getState }) => {
  try {
    const response = await API.post(`/posts/${postId}/like`);
    return { postId, userId: getState().auth.userId, ...response.data }; // returns message, but we optimistically update often
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to like post');
  }
});

export const addComment = createAsyncThunk('posts/addComment', async ({ postId, text }, { rejectWithValue }) => {
  try {
    const response = await API.post(`/posts/${postId}/comments`, { text });
    return { postId, comment: response.data };
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to add comment');
  }
});

export const deletePost = createAsyncThunk('posts/delete', async (postId, { rejectWithValue }) => {
  try {
    await API.delete(`/posts/${postId}`);
    return postId;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to delete post');
  }
});

const initialState = {
  posts: [],
  loading: false,
  error: null,
};

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase('auth/logout', () => ({...initialState}))
      // Fetch
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createPost.fulfilled, (state, action) => {
        state.posts.unshift(action.payload);
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        state.posts = state.posts.filter(post => post.id !== action.payload);
      })
      // Like
      .addCase(likePost.fulfilled, (state, action) => {
         const post = state.posts.find(p => p.id === action.payload.postId);
         if (post) {
             post.likes_count = action.payload.likes_count;
             
             // Optimistically update liked_by for current user (ID 1)
             const currentUserId = action.payload.userId;
             if (!post.liked_by) post.liked_by = [];
             
             if (action.payload.liked) {
                 if (!post.liked_by.includes(currentUserId)) post.liked_by.push(currentUserId);
             } else {
                 post.liked_by = post.liked_by.filter(id => id !== currentUserId);
             }
         }
      })
      .addCase(likePost.rejected, (state, action) => {
          // Could rollback optimistic update here if we stored previous state
          // For now, we just log or set error, maybe toast notification
          console.error("Like failed:", action.payload);
      })
      // Comment
      .addCase(addComment.fulfilled, (state, action) => {
          const post = state.posts.find(p => p.id === action.payload.postId);
          if (post) {
              if (!post.comments) post.comments = [];
              post.comments.push(action.payload.comment);
          }
      });
  },
});

export default postsSlice.reducer;
