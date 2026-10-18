import { getDB, setDB } from './utils';
import { mockUser } from '../mockData';

export const handleAuth = (method, url, config) => {
    // POST auth/register
    if (method === 'post' && url === 'auth/register') {
        const regData = JSON.parse(config.data);
        const users = getDB('db_users');
        const newUser = {
            id: Math.floor(Math.random() * 10000),
            ...regData,
            status: 'Pending',
            joined_at: new Date().toISOString()
        };
        users.push(newUser);
        setDB('db_users', users);
        
        console.log('[MOCK ADAPTER] User Registered:', newUser);
        return { data: { message: 'Registered successfully. Pending verification.', user: newUser }, status: 201 };
    }

    // POST auth/token (Login)
    if (method === 'post' && url === 'auth/token') {
            const { email, password } = JSON.parse(config.data);
            
            // Store current session email for mock 'me' endpoint
            localStorage.setItem('mock_session_email', email);

            // Hardcoded Admin
            if (email === 'admin@college.edu' && password === 'admin123') {
                return { 
                    data: { access_token: 'mock-jwt-admin-token', token_type: 'bearer' }, 
                    status: 200 
                };
            }
            
            // CHECK if user exists
            const users = getDB('db_users');
            const user = users.find(u => u.email === email);
            
            // Permissive login for now, but strictly checking would be better
            if (!user) {
                // For now, allow but they might get fallback user
            }

            // Normal User Login
            return { data: { access_token: 'mock-jwt-token-access', token_type: 'bearer' }, status: 200 };
    }

    // GET users/me
    if (method === 'get' && url === 'users/me') {
        const token = config.headers.Authorization?.replace('Bearer ', '');
        
        if (token === 'mock-jwt-admin-token') {
            return { 
                data: { 
                    id: 999, 
                    name: 'System Administrator', 
                    email: 'admin@college.edu', 
                    role: 'admin',
                    status: 'Active' 
                }, 
                status: 200 
            };
        }
        
        // Dynamic User Retrieval based on Session
        const sessionEmail = localStorage.getItem('mock_session_email');
        const users = getDB('db_users');
        const currentUser = users.find(u => u.email === sessionEmail);

        if (currentUser) {
            return { data: currentUser, status: 200 };
        }
        
        // Fallback to default mockUser if session invalid
        return { data: mockUser, status: 200 };
    }

    // PUT users/me (Update Profile)
    if (method === 'put' && url === 'users/me') {
        const updateData = JSON.parse(config.data);
        const token = config.headers.Authorization?.replace('Bearer ', '');
        
        // If Admin
        if (token === 'mock-jwt-admin-token') {
            return { data: { ...updateData, id: 999, role: 'admin' }, status: 200 };
        }

        // Normal User
        const sessionEmail = localStorage.getItem('mock_session_email');
        let users = getDB('db_users');
        const userIndex = users.findIndex(u => u.email === sessionEmail);

        if (userIndex > -1) {
            // Merge updates
            const updatedUser = { ...users[userIndex], ...updateData };
            users[userIndex] = updatedUser;
            setDB('db_users', users);
            return { data: updatedUser, status: 200 };
        }
        
        // Fallback (e.g. if using default mockUser)
        return { data: { ...mockUser, ...updateData }, status: 200 };
    }

    return null; // Not handled
};
