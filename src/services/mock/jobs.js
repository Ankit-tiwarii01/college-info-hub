import { getDB, setDB } from './utils';

export const handleJobs = (method, url, config) => {

    if (method === 'get' && url === 'jobs/') {
        return { data: getDB('db_jobs'), status: 200 };
    }

    // POST jobs/
    if (method === 'post' && url === 'jobs/') {
            const newJob = JSON.parse(config.data);
            const jobs = getDB('db_jobs');
            const createdJob = { 
                ...newJob, 
                id: Math.floor(Math.random() * 10000), 
                posted_date: new Date().toISOString() 
            };
            jobs.unshift(createdJob);
            setDB('db_jobs', jobs);
            return { data: createdJob, status: 201 };
    }

    // DELETE jobs/:id
    const deleteUserJobMatch = url.match(/^jobs\/(\d+)$/);
    if (method === 'delete' && deleteUserJobMatch) {
        const id = parseInt(deleteUserJobMatch[1]);
        let jobs = getDB('db_jobs');
        const initialLength = jobs.length;
        jobs = jobs.filter(j => j.id !== id);
        
        if (jobs.length < initialLength) {
            setDB('db_jobs', jobs);
            return { data: { message: 'Job deleted successfully' }, status: 200 };
        }
        return Promise.reject({ response: { status: 404 } });
    }

    // POST jobs/:id/apply
    const applyMatch = url.match(/^jobs\/(\d+)\/apply/);
    if (method === 'post' && applyMatch) {
            const jobId = parseInt(applyMatch[1]);
            const applicationData = JSON.parse(config.data);
            const applications = getDB('db_applications');
            
            const newApplication = {
                id: Math.floor(Math.random() * 10000),
                jobId,
                ...applicationData,
                applied_at: new Date().toISOString()
            };
            applications.push(newApplication);
            setDB('db_applications', applications);
            
            return { data: { message: 'Application submitted successfully' }, status: 200 };
    }

    const jobMatch = url.match(/^jobs\/(\d+)$/);
    if(jobMatch) {
        const job = getDB('db_jobs').find(j => j.id == jobMatch[1]);
        return job ? { data: job, status: 200 } : Promise.reject({ response: { status: 404 } });
    }

    return null;
};
