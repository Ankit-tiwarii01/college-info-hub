import React from 'react';
import { Clock, ThumbsUp, MessageSquare, Send } from 'lucide-react';

const PostCard = ({ post, requireLogin }) => {
  const name = post.user?.name || 'Community Member';
  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-100 hover:border-amber-200 hover:shadow-xl transition-all group relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
      <div className="flex items-center space-x-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm shadow-md">{name.charAt(0)}</div>
        <div>
          <p className="font-bold text-slate-800 text-sm">{name}</p>
          <p className="text-xs text-slate-400 flex items-center"><Clock size={10} className="mr-1" />{new Date(post.created_at).toLocaleDateString()}</p>
        </div>
      </div>
      {post.title && <h4 className="font-serif font-bold text-lg text-slate-900 mb-2">{post.title}</h4>}
      <p className="text-slate-600 text-sm leading-relaxed line-clamp-4 mb-4">{post.content}</p>
      {post.image && <div className="rounded-xl overflow-hidden mb-4 border border-slate-100"><img src={post.image} alt="" className="w-full h-48 object-cover" /></div>}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-slate-400 text-sm">
        <button onClick={() => requireLogin('Sign in to like posts.')} className="flex items-center gap-1.5 hover:text-amber-600 transition"><ThumbsUp size={16} />{post.likes_count || 0}</button>
        <button onClick={() => requireLogin('Sign in to comment.')} className="flex items-center gap-1.5 hover:text-blue-600 transition"><MessageSquare size={16} />{post.comments?.length || 0}</button>
        <button onClick={() => requireLogin('Sign in to share.')} className="flex items-center gap-1.5 hover:text-emerald-600 transition"><Send size={16} />Share</button>
      </div>
    </div>
  );
};

export default PostCard;
