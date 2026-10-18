import { getDB, setDB } from './utils';

export const handlePosts = (method, url, config) => {

    // GET posts/
    if (method === 'get' && url === 'posts/') {
        return { data: getDB('db_posts'), status: 200 };
    }

    // POST posts/
    if (method === 'post' && url === 'posts/') {
        const postData = JSON.parse(config.data);
        const posts = getDB('db_posts');
        const newPost = {
            id: Math.floor(Math.random() * 10000),
            ...postData,
            likes_count: 0,
            comments: [],
            created_at: new Date().toISOString()
        };
        posts.unshift(newPost); // Add to top
        setDB('db_posts', posts);
        return { data: newPost, status: 201 };
    }

    // POST posts/:id/like
    const likeMatch = url.match(/^posts\/(\d+)\/like/);
    if (method === 'post' && likeMatch) {
        const postId = parseInt(likeMatch[1]);
        const posts = getDB('db_posts');
        const postIndex = posts.findIndex(p => p.id === postId);
        
        if (postIndex > -1) {
            const currentUserId = 1; // MOCK Current User for logic
            if (!posts[postIndex].liked_by) posts[postIndex].liked_by = [];
            
            const alreadyLikedIndex = posts[postIndex].liked_by.indexOf(currentUserId);
            
            if (alreadyLikedIndex > -1) {
                // UNLIKE
                posts[postIndex].liked_by.splice(alreadyLikedIndex, 1);
                posts[postIndex].likes_count = Math.max(0, (posts[postIndex].likes_count || 1) - 1);
            } else {
                // LIKE
                posts[postIndex].liked_by.push(currentUserId);
                posts[postIndex].likes_count = (posts[postIndex].likes_count || 0) + 1;
            }

            setDB('db_posts', posts);
            
            return { 
                data: { 
                    likes_count: posts[postIndex].likes_count, 
                    liked: alreadyLikedIndex === -1 
                }, 
                status: 200 
            };
        }
        return Promise.reject({ response: { status: 404 } });
    }

    // DELETE posts/:id
    const deletePostMatch = url.match(/^posts\/(\d+)$/);
    if (method === 'delete' && deletePostMatch) {
        const postId = parseInt(deletePostMatch[1]);
        let posts = getDB('db_posts');
        const initialLength = posts.length;
        posts = posts.filter(p => p.id !== postId);
        
        if (posts.length < initialLength) {
            setDB('db_posts', posts);
            return { data: { message: 'Post deleted successfully' }, status: 200 };
        }
        return Promise.reject({ response: { status: 404 } });
    }

    // POST posts/:id/comment
    const commentMatch = url.match(/^posts\/(\d+)\/comment/);
    if (method === 'post' && commentMatch) {
        const postId = parseInt(commentMatch[1]);
        const commentData = JSON.parse(config.data);
        const posts = getDB('db_posts');
        const postIndex = posts.findIndex(p => p.id === postId);

        if (postIndex > -1) {
            const newComment = {
                id: Math.floor(Math.random() * 10000),
                text: commentData.text,
                author: 'You', 
                created_at: new Date().toISOString()
            };
            if (!posts[postIndex].comments) posts[postIndex].comments = [];
            posts[postIndex].comments.push(newComment);
            setDB('db_posts', posts);
            return { data: newComment, status: 201 };
        }
        return Promise.reject({ response: { status: 404 } });
    }

    return null;
};
