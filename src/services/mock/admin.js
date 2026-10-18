import { getDB, setDB } from './utils';

export const handleAdmin = (method, url, config) => {

    // GET admin/stats
    if (method === 'get' && url === 'admin/stats') {
        const users = getDB('db_users');
        const posts = getDB('db_posts');
        return {
            data: {
                totalStudents: users.filter(u => u.role === 'student' && u.status === 'Active').length,
                totalAlumni: users.filter(u => u.role === 'alumni' && u.status === 'Active').length,
                pendingApprovals: users.filter(u => u.status === 'Pending').length,
                totalPosts: posts.length
            },
            status: 200
        };
    }

    // GET admin/jobs (Monitoring)
    if (method === 'get' && url === 'admin/jobs') {
            return { data: getDB('db_jobs'), status: 200 };
    }

    // DELETE admin/jobs/:id
    const deleteJobMatch = url.match(/^admin\/jobs\/(\d+)/);
    if (method === 'delete' && deleteJobMatch) {
            const id = parseInt(deleteJobMatch[1]);
            let jobs = getDB('db_jobs');
            jobs = jobs.filter(j => j.id !== id);
            setDB('db_jobs', jobs);
            return { data: { message: 'Job deleted' }, status: 200 };
    }

    // GET admin/pending-users
    if (method === 'get' && url === 'admin/pending-users') {
            const users = getDB('db_users');
            const pending = users.filter(u => u.status === 'Pending');
            return { data: pending, status: 200 };
    }
    
    // GET admin/all-users
    if (method === 'get' && url.match(/^admin\/users/)) {
        const users = getDB('db_users');
        return { data: users, status: 200 };
    }

    // POST admin/approve/:id
    const approveMatch = url.match(/^admin\/approve\/(\d+)/);
    if (method === 'post' && approveMatch) {
            const id = parseInt(approveMatch[1]);
            const users = getDB('db_users');
            const userIndex = users.findIndex(u => u.id === id);
            if (userIndex > -1) {
                users[userIndex].status = 'Active';
                setDB('db_users', users);
                return { data: { message: 'User approved' }, status: 200 };
            }
            return Promise.reject({ response: { status: 404, data: { detail: 'User not found' } } });
    }
    
    // POST admin/reject/:id
    const rejectMatch = url.match(/^admin\/reject\/(\d+)/);
    if (method === 'post' && rejectMatch) {
            const id = parseInt(rejectMatch[1]);
            let users = getDB('db_users');
            users = users.filter(u => u.id !== id);
            setDB('db_users', users);
            return { data: { message: 'User rejected' }, status: 200 };
    }

    // POST admin/block/:id
    const blockMatch = url.match(/^admin\/block\/(\d+)/);
    if (method === 'post' && blockMatch) {
            const id = parseInt(blockMatch[1]);
            const users = getDB('db_users');
            const userIndex = users.findIndex(u => u.id === id);
            if (userIndex > -1) {
                users[userIndex].status = users[userIndex].status === 'Blocked' ? 'Active' : 'Blocked'; 
                setDB('db_users', users);
                return { data: { message: 'User status updated', status: users[userIndex].status }, status: 200 };
            }
    }

    return null;
};
