import { getDB, setDB } from './utils';

export const handleReports = (method, url, config) => {

    // POST /reports
    if (method === 'post' && url === 'reports') {
        const reportData = JSON.parse(config.data);
        const reports = getDB('db_reports');
        const newReport = {
            id: Math.floor(Math.random() * 10000),
            ...reportData,
            status: 'Pending', // Pending, Resolved, Dismissed
            created_at: new Date().toISOString()
        };
        reports.push(newReport);
        setDB('db_reports', reports);
        
        console.log('[MOCK ADAPTER] New Report:', newReport);
        return { data: { message: 'Report submitted successfully.' }, status: 201 };
    }

    // GET /admin/reports
    if (method === 'get' && url === 'admin/reports') {
        return { data: getDB('db_reports'), status: 200 };
    }

    // POST /admin/reports/:id/action
    const actionMatch = url.match(/^admin\/reports\/(\d+)\/action/);
    if (method === 'post' && actionMatch) {
            const reportId = parseInt(actionMatch[1]);
            const { action } = JSON.parse(config.data); // action: 'dismiss', 'delete_post', 'ban_user'
            
            const reports = getDB('db_reports');
            const reportIndex = reports.findIndex(r => r.id === reportId);
            
            if (reportIndex > -1) {
                const report = reports[reportIndex];
                
                if (action === 'dismiss') {
                    report.status = 'Dismissed';
                }
                
                else if (action === 'delete_post' && report.targetType === 'post') {
                    report.status = 'Resolved';
                    // Delete the post actual
                    let posts = getDB('db_posts');
                    posts = posts.filter(p => p.id !== report.targetId);
                    setDB('db_posts', posts);
                }
                
                else if (action === 'ban_user') {
                     report.status = 'Resolved';
                     // Ban the user
                     const users = getDB('db_users');
                     const userIndex = users.findIndex(u => u.name === report.reportedUser || u.id === report.reportedUserId);
                     if (userIndex > -1) {
                         users[userIndex].status = 'Blocked';
                         setDB('db_users', users);
                     }
                }

                setDB('db_reports', reports);
                return { data: { message: `Report ${action} successful` }, status: 200 };
            }
            return Promise.reject({ response: { status: 404 } });
    }

    return null;
};
