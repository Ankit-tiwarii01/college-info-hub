import { getDB, setDB } from './utils';

export const handleMentorship = (method, url, config) => {

    // GET mentorship/requests (My Sent Requests)
    if (method === 'get' && url === 'mentorship/requests') {
            return { data: getDB('db_mentorship_requests'), status: 200 };
    }

    // GET mentorship/requests/incoming (Alumni: Requests sent TO me)
    if (method === 'get' && url === 'mentorship/requests/incoming') {
            const requests = getDB('db_mentorship_requests');
            return { data: requests, status: 200 };
    }

    // POST mentorship/request (Send Request)
    if (method === 'post' && url === 'mentorship/request') {
            const reqData = JSON.parse(config.data);
            const requests = getDB('db_mentorship_requests');
            const newReq = {
                id: Math.floor(Math.random() * 10000),
                ...reqData,
                status: 'Pending',
                requested_date: new Date().toISOString()
            };
            requests.push(newReq);
            setDB('db_mentorship_requests', requests);
            return { data: newReq, status: 201 };
    }

    // POST mentorship/requests/:id/accept
    const acceptMatch = url.match(/^mentorship\/requests\/(\d+)\/accept/);
    if (method === 'post' && acceptMatch) {
            const id = parseInt(acceptMatch[1]);
            const requests = getDB('db_mentorship_requests');
            const idx = requests.findIndex(r => r.id === id);
            if (idx > -1) {
                requests[idx].status = 'Accepted';
                setDB('db_mentorship_requests', requests);
                return { data: requests[idx], status: 200 };
            }
            return Promise.reject({ response: { status: 404 } });
    }

    // POST mentorship/requests/:id/reject
    const rejectMatch2 = url.match(/^mentorship\/requests\/(\d+)\/reject/);
    if (method === 'post' && rejectMatch2) {
            const id = parseInt(rejectMatch2[1]);
            const requests = getDB('db_mentorship_requests');
            const idx = requests.findIndex(r => r.id === id);
            if (idx > -1) {
                requests[idx].status = 'Rejected';
                setDB('db_mentorship_requests', requests);
                return { data: requests[idx], status: 200 };
            }
            return Promise.reject({ response: { status: 404 } });
    }

    // GET mentorship/mentors
    if (url === 'mentorship/mentors') {
        return { data: getDB('db_mentors'), status: 200 };
    }
    
    // GET mentorship/mentors/:id
    const mentorMatch = url.match(/^mentorship\/mentors\/(\d+)$/);
    if(mentorMatch) {
            const mentor = getDB('db_mentors').find(m => m.id == mentorMatch[1]);
            return mentor ? { data: mentor, status: 200 } : Promise.reject({ response: { status: 404 } });
    }

    return null;
};
