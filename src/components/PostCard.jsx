import React, { useState } from 'react';
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal, Send, Clock, Trash2, Flag } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { likePost, addComment, deletePost } from '../features/posts/postsSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ReportModal from './ReportModal';

const PostCard = ({ post }) => {
  const dispatch = useDispatch();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const { user } = useSelector((state) => state.auth);

  const isLiked = post.liked_by?.includes(user?.id);

  const handleLike = () => {
    dispatch(likePost(post.id));
  };

  const handleCommentSubmit = async (e) => {
      e.preventDefault();
      if (commentText.trim()) {
          try {
          await dispatch(addComment({ 
              postId: post.id, 
              text: commentText,
              user: 'You'
          })).unwrap();
          setCommentText('');
          } catch (error) { toast.error(typeof error === 'string' ? error : 'Comment failed.'); }
      }
  };

  const handleShare = async () => {
    try {
        if (navigator.share) {
            await navigator.share({
                title: post.title || 'Check out this post',
                text: post.content,
                url: window.location.href
            });
        } else {
            await navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied!', { description: 'Post link copied to clipboard.' });
        }
    } catch (err) {
        console.error('Error sharing:', err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
        try {
            await dispatch(deletePost(post.id)).unwrap();
            toast.success('Post deleted successfully');
        } catch (err) {
            toast.error(typeof err === 'string' ? err : 'Failed to delete post');
        }
    }
  };

  const date = new Date(post.created_at).toLocaleDateString();
  const isAdminPost = !post.user_id || post.user?.role === 'admin';
  const authorName = post.user?.name || post.approved_by || 'System Admin';

  return (
    <>
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 rounded-2xl mb-6 border border-white/60 shadow-xl shadow-amber-900/5 hover:border-amber-200 hover:shadow-2xl hover:shadow-amber-900/10 transition-all duration-300 relative overflow-hidden group bg-white/60"
    >
      {/* Decorative gradient blob */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-500"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-serif font-bold text-xl shadow-lg border border-white/40">
              {authorName.charAt(0)}
            </div>
            <div>
              <div className="text-lg font-serif font-bold text-slate-800 flex items-center gap-2">
                <span>{authorName}</span>
                {isAdminPost && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wider">
                    Admin
                  </span>
                )}
                {post.approval_status !== 'Approved' && (
                  <span className={`${post.approval_status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-amber-50 text-amber-600 border-amber-200/60'} border text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                    {post.approval_status || 'Pending'}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-medium flex items-center mt-0.5">
                  <Clock size={10} className="mr-1" />
                  {date}
              </div>
            </div>
          </div>
          <div className="relative">
            <button 
                onClick={() => setShowMenu(!showMenu)}
                className="text-slate-400 hover:text-amber-600 transition p-2 hover:bg-amber-50 rounded-full"
            >
                <MoreHorizontal size={20} />
            </button>
            {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 overflow-hidden">
                    <button 
                        onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center"
                    >
                        <Flag size={15} className="mr-2 text-rose-500" />
                        <span>Report Post</span>
                    </button>
                    {(user?.role === 'admin' || post.user_id === user?.id) && <button 
                        onClick={() => { setShowMenu(false); handleDelete(); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center border-t border-slate-100"
                    >
                        <Trash2 size={15} className="mr-2 text-red-500" />
                        <span>Delete Post</span>
                    </button>}
                </div>
            )}
          </div>
        </div>
        
        {post.title && (
            <h3 className="text-xl font-serif font-bold text-slate-900 mb-3">{post.title}</h3>
        )}

        <p className="text-slate-600 mb-6 whitespace-pre-line leading-relaxed text-sm font-medium">
          {post.content}
        </p>

         {post.image && (
            <div className="mb-6 rounded-2xl overflow-hidden border border-slate-100 shadow-sm relative group/image">
                <img src={post.image} alt="Post content" className="w-full h-auto object-cover max-h-96" />
                <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/5 transition-colors"></div>
            </div>
        )}
        
        <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-slate-500">
            <button disabled={user?.role === 'admin'} onClick={handleLike} className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all active:scale-95 ${isLiked ? 'bg-amber-50 text-amber-600 font-bold' : 'hover:bg-slate-50 hover:text-amber-600'}`}>
                <ThumbsUp size={18} className={`${isLiked ? 'fill-current' : ''}`} />
                <span className="text-sm">{post.likes_count || 0}</span>
            </button>
            <button 
                onClick={() => setShowComments(!showComments)}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
            >
                <MessageCircle size={18} />
                <span className="text-sm font-medium">{post.comments?.length || 0} Comments</span>
            </button>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
            {showComments && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                >
                    <div className="pt-6 mt-4 border-t border-slate-100/50">
                        <div className="space-y-4 mb-6">
                            {post.comments?.map((comment, idx) => (
                                <div key={idx} className="flex items-start space-x-3 text-sm">
                                    <div className="font-bold text-slate-700 whitespace-nowrap">{typeof comment.user === 'object' ? (comment.user.name || 'User') : (comment.user || 'User')}:</div>
                                    <div className="text-slate-600 bg-slate-50 px-3 py-2 rounded-r-xl rounded-bl-xl">{comment.text}</div>
                                </div>
                            ))}
                        </div>
                        
                        <form onSubmit={handleCommentSubmit} className="flex items-center relative">
                            <input 
                                type="text"
                                placeholder="Write a comment..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 px-5 pr-12 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm text-slate-700 placeholder-slate-400"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                            />
                            <button 
                                type="submit" 
                                disabled={!commentText.trim()}
                                className="absolute right-2 p-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500 transition-all shadow-md"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </motion.div>

    <ReportModal 
        isOpen={showReportModal} 
        onClose={() => setShowReportModal(false)} 
        initialTargetId={`Post #${post.id}`} 
        initialTargetType="Post"
    />
    </>
  );
};

export default PostCard;
