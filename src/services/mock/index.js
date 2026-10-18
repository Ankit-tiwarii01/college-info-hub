import { initializeMockDB, delay } from './utils';
import { handleAuth } from './auth';
import { handlePosts } from './posts';
import { handleJobs } from './jobs';
import { handleMentorship } from './mentorship';
import { handleAdmin } from './admin';
import { handleReports } from './reports';
import { handleEvents } from './events';

// Initialize DB on load
initializeMockDB();

export const mockAdapter = async (config) => {
    const { method } = config;
    let { url } = config;

    // Normalization
    if (config.baseURL && url.startsWith(config.baseURL)) url = url.replace(config.baseURL, '');
    url = url.replace('http://localhost:8000/api', '');
    if (url.startsWith('/')) url = url.substring(1);

    console.log(`[MOCK ADAPTER] ${method.toUpperCase()} ${url}`);
    
    await delay(300); // Simulate Network Latency

    // Chain of Responsibility Pattern
    const response = 
        handleAuth(method, url, config) ||
        handlePosts(method, url, config) ||
        handleJobs(method, url, config) ||
        handleMentorship(method, url, config) ||
        handleAdmin(method, url, config) ||
        handleReports(method, url, config) ||
        handleEvents(method, url, config);

    if (response) {
        // If response is a promise (e.g. rejection), return it, else wrap in promise
        if (response.then) return response; 
        return Promise.resolve(response);
    }
    
    // Fallback for notifications or unhandled simple GETs
    if (method === 'get' && url === 'notifications') {
         const notifications = JSON.parse(localStorage.getItem('db_notifications') || '[]');
         return { data: notifications, status: 200 };
    }

    return Promise.reject({
        response: {
            status: 404,
            data: { detail: 'Mock endpoint not found' } // Standardized 404
        }
    });
};
