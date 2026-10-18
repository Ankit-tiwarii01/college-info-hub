import { 
    mockPosts, 
    mockUser, 
    mockJobs, 
    mockMentorshipRequests, 
    mockMentors,
    mockUsers,
    mockApplications,
    mockNotifications,
    mockEvents
} from '../mockData';

export const MOCK_VERSION = 'v2.2';

// Initialize LocalStorage with Mock Data
export const initStorage = (key, data, force = false) => {
    const currentVersion = localStorage.getItem('mock_version');
    if (!localStorage.getItem(key) || currentVersion !== MOCK_VERSION || force) {
        localStorage.setItem(key, JSON.stringify(data));
    }
};

export const initializeMockDB = () => {
    initStorage('mock_version', MOCK_VERSION, true); 
    
    initStorage('db_posts', mockPosts, true);
    initStorage('db_jobs', mockJobs, true);
    initStorage('db_mentors', mockMentors, true);
    initStorage('db_mentorship_requests', mockMentorshipRequests, true);
    initStorage('db_applications', mockApplications, true);
    initStorage('db_notifications', mockNotifications, true);
    initStorage('db_events', mockEvents, true);
    initStorage('db_users', [ ...mockUsers, { id: 1, ...mockUser, status: 'Active' } ], true);
};

// Helper Helpers
export const getDB = (key) => JSON.parse(localStorage.getItem(key) || '[]');
export const setDB = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// Simulates network delay
export const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
