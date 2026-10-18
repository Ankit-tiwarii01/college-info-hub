import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPosts, createPost } from '../../features/posts/postsSlice';
import PostCard from '../../components/PostCard';
import SkeletonCard from '../../components/SkeletonCard';
import { Send, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '../../components/Breadcrumbs';

const FeedPage = () => {
  const dispatch = useDispatch();
  const { posts, loading, error } = useSelector((state) => state.posts);
  const { user } = useSelector((state) => state.auth);
  const canPost = ['admin', 'alumni'].includes(user?.role?.toLowerCase());
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);

  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!canPost || !content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await dispatch(createPost({content: content.trim(), image: imageUrl, type: 'general'})).unwrap();
      toast.success(user?.role === 'admin' ? 'Post published!' : 'Post submitted for admin approval.');
      setContent(''); setImageUrl(''); setShowImageInput(false);
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to submit post.');
    } finally { setSubmitting(false); }
  };

  const avatarInitial = user?.name ? user.name.charAt(0).toUpperCase() : (user?.role === 'admin' ? 'A' : 'U');

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 md:px-0">
      <Breadcrumbs items={[{ label: 'Dashboard', path: user?.role === 'admin' ? '/admin' : user?.role === 'alumni' ? '/alumni/dashboard' : '/student/dashboard' }, { label: 'Notices & Feed' }]} />

      {/* Create Post Widget */}
      {canPost && (
      <div className="glass-panel rounded-2xl p-6 mb-8 transform hover:scale-[1.01] transition-all duration-300 border border-white/60 shadow-xl shadow-amber-900/5 bg-white/70 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500"></div>
        <div className="flex items-start space-x-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex-shrink-0 shadow-lg border-2 border-white flex items-center justify-center text-white font-serif font-bold text-xl">
                 {avatarInitial}
            </div>
            <form onSubmit={handlePostSubmit} className="flex-1">
                <textarea 
                    className="w-full bg-white/50 border border-amber-900/10 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none p-4 text-slate-700 placeholder-slate-400 transition-all shadow-inner text-sm font-medium outline-none"
                    rows={showImageInput ? 2 : 3}
                    placeholder="What's on your mind? Share an update with the community..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                ></textarea>

                {/* Hidden File Input */}
                <input 
                    type="file" 
                    id="imageInput" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                setImageUrl(reader.result);
                                setShowImageInput(true);
                            };
                            reader.readAsDataURL(file);
                        }
                    }}
                />

                {showImageInput && imageUrl && (
                    <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-200 group/preview animate-in zoom-in duration-300">
                        <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
                         <button 
                            type="button"
                            onClick={() => { setShowImageInput(false); setImageUrl(''); }}
                            className="absolute right-2 top-2 bg-black/50 hover:bg-red-500 text-white p-1.5 rounded-full transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
                
                <div className="flex justify-between items-center mt-4 border-t border-slate-100/50 pt-3">
                    <div className="flex space-x-2">
                        <button 
                            type="button" 
                            onClick={() => document.getElementById('imageInput').click()}
                            className={`p-2 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors ${imageUrl ? 'bg-amber-50 text-amber-600' : ''}`}
                            title="Add Image"
                        >
                            <ImageIcon size={18} />
                        </button>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={!content.trim() || submitting}
                        className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-5 py-2 rounded-xl font-bold text-xs flex items-center space-x-2 hover:shadow-lg hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
                    >
                        <span>Post</span>
                        <Send size={14} />
                    </button>
                </div>
            </form>
        </div>
      </div>

      )}
      {error && <p role="alert" className="text-red-600 mb-4">{typeof error === 'string' ? error : 'Unable to load posts.'}</p>}
      {/* Feed List */}
      {loading && posts.length === 0 ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} avatar lines={4} wide />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
            {posts.map(post => (
                <PostCard key={post.id} post={post} />
            ))}
            {posts.length === 0 && !loading && (
                <div className="text-center py-16 px-6 glass-panel rounded-2xl border border-dashed border-slate-300">
                    <div className="text-slate-400 font-serif italic text-xl mb-2">No posts yet.</div>
                    <p className="text-slate-500 text-sm">Updates from alumni and administrators will appear here.</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default FeedPage;
