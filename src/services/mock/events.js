import { getDB, setDB } from './utils';

export const handleEvents = (method, url, config) => {

    // GET /events
    if (method === 'get' && url === 'events') {
        const events = getDB('db_events');
        return { data: events, status: 200 };
    }

    // POST /events (Create Event)
    if (method === 'post' && url === 'events') {
        const eventData = JSON.parse(config.data);
        const events = getDB('db_events');
        const newEvent = {
            id: Math.floor(Math.random() * 10000),
            ...eventData,
            audience: eventData.audience || 'All',
            attendees: 0,
            image: eventData.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000' // Default image
        };
        events.unshift(newEvent);
        setDB('db_events', events);
        return { data: newEvent, status: 201 };
    }

    // PUT /events/:id (Update Event)
    const updateMatch = url.match(/^events\/(\d+)$/);
    if (method === 'put' && updateMatch) {
        const id = parseInt(updateMatch[1]);
        const updateData = JSON.parse(config.data);
        let events = getDB('db_events');
        const index = events.findIndex(e => e.id === id);

        if (index > -1) {
            events[index] = { ...events[index], ...updateData };
            setDB('db_events', events);
            return { data: events[index], status: 200 };
        }
        return Promise.reject({ response: { status: 404, data: { detail: 'Event not found' } } });
    }

    // DELETE /events/:id
    const deleteMatch = url.match(/^events\/(\d+)$/);
    if (method === 'delete' && deleteMatch) {
        const id = parseInt(deleteMatch[1]);
        let events = getDB('db_events');
        const initialLength = events.length;
        events = events.filter(e => e.id !== id);
        
        if (events.length < initialLength) {
            setDB('db_events', events);
            return { data: { message: 'Event deleted successfully' }, status: 200 };
        }
        return Promise.reject({ response: { status: 404, data: { detail: 'Event not found' } } });
    }

    // POST /events/:id/rsvp
    const rsvpMatch = url.match(/^events\/(\d+)\/rsvp$/);
    if (method === 'post' && rsvpMatch) {
        const id = parseInt(rsvpMatch[1]);
        const { status } = JSON.parse(config.data); // 'going', 'interested', 'not_going'
        let events = getDB('db_events');
        const eventIndex = events.findIndex(e => e.id === id);

        if (eventIndex > -1) {
            // Mock RSVP logic: just update the attendees count roughly
            // In a real app, we'd store the user's RSVP status in a separate table/collection
            if (status === 'going' || status === 'attending') {
                events[eventIndex].attendees += 1;
            } else if (status === 'not_going') {
                events[eventIndex].attendees = Math.max(0, events[eventIndex].attendees - 1);
            }
            setDB('db_events', events);
            return { data: { message: `RSVP updated to ${status}` }, status: 200 };
        }
        return Promise.reject({ response: { status: 404, data: { detail: 'Event not found' } } });
    }

    return null;
};
