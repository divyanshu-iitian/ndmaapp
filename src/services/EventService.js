import { API_BASE_URL, NEW_AUTH_BASE_URL } from './config';
import { authService } from './AuthService';

class EventService {
    constructor() {
        this.useBackend = true;
    }

    // Create a new event
    async createEvent(eventData) {
        try {
            console.log('📅 EventService: Creating event...', eventData);

            // Use NEW_AUTH_BASE_URL which already includes /api
            // Endpoint in SIH_BACKEND-main is /events/create
            const response = await authService.authenticatedFetch(`${NEW_AUTH_BASE_URL}/events/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData),
            });

            const data = await response.json();

            if (response.ok) {
                console.log('✅ Event created successfully:', data.event._id);
                return { success: true, event: data.event, message: data.message };
            } else {
                console.error('❌ Failed to create event:', data.message);
                return { success: false, error: data.message || 'Failed to create event' };
            }
        } catch (error) {
            console.error('❌ Event creation error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get trainer's events
    async getMyEvents(status = '') {
        try {
            // Using NEW_AUTH_BASE_URL for my-events too
            let url = `${NEW_AUTH_BASE_URL}/events/my-events`;
            if (status) url += `?status=${status}`;

            const response = await authService.authenticatedFetch(url, {
                method: 'GET',
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, events: data.events };
            }
            return { success: false, error: data.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Search events
    async searchEvents(query) {
        try {
            // Using NEW_AUTH_BASE_URL for search
            const response = await authService.authenticatedFetch(`${NEW_AUTH_BASE_URL}/events/search?${new URLSearchParams(query)}`, {
                method: 'GET',
            });
            const data = await response.json();
            return { success: true, ...data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    // Get event dashboard stats
    async getEventDashboard() {
        try {
            const response = await authService.authenticatedFetch(`${NEW_AUTH_BASE_URL}/events/dashboard`, {
                method: 'GET',
            });
            const data = await response.json();
            if (response.ok) {
                return { success: true, dashboard: data };
            }
            return { success: false, error: data.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    // Join Event By Code
    async joinEventByCode(code) {
        try {
            const response = await authService.authenticatedFetch(`${NEW_AUTH_BASE_URL}/events/join/code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            const data = await response.json();
            if (response.ok) return { success: true, event: data.event, message: data.message, waitlisted: data.waitlisted };
            return { success: false, error: data.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Toggle Attendance (Trainer)
    async toggleAttendance(eventId, enabled) {
        try {
            const response = await authService.authenticatedFetch(`${NEW_AUTH_BASE_URL}/events/${eventId}/attendance-status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            });
            const data = await response.json();
            if (response.ok) return { success: true, attendanceEnabled: data.attendanceEnabled };
            return { success: false, error: data.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Mark Attendance (Trainee)
    async markAttendance(eventId, metadata = {}) {
        try {
            const response = await authService.authenticatedFetch(`${NEW_AUTH_BASE_URL}/events/${eventId}/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metadata)
            });
            const data = await response.json();
            if (response.ok) return { success: true, message: data.message };
            return { success: false, error: data.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get Attendees (Trainer)
    async getEventAttendees(eventId) {
        try {
            const response = await authService.authenticatedFetch(`${NEW_AUTH_BASE_URL}/events/${eventId}/attendees`, {
                method: 'GET'
            });
            const data = await response.json();
            if (response.ok) return { success: true, attendees: data.attendees, attendanceEnabled: data.attendanceEnabled };
            return { success: false, error: data.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    // Get Event Days (Schedule)
    async getEventDays(eventId) {
        try {
            const response = await authService.authenticatedFetch(`${NEW_AUTH_BASE_URL}/event-days/event/${eventId}`, {
                method: 'GET'
            });
            const data = await response.json();
            if (response.ok) return { success: true, eventDays: data.eventDays, stats: data.stats };
            return { success: false, error: data.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Upload Photos for Event Day
    async uploadEventDayPhotos(eventDayId, photoUri) {
        try {
            console.log('📸 Uploading photo for day:', eventDayId);

            // Prepare file name and type
            let filename = photoUri.split('/').pop();
            let match = /\.(\w+)$/.exec(filename);
            let type = match ? `image/${match[1]}` : `image/jpeg`;
            if (type === 'image/jpg') type = 'image/jpeg';

            const formData = new FormData();
            formData.append('photos', {
                uri: photoUri,
                name: filename || `day_${eventDayId}_${Date.now()}.jpg`,
                type: type
            });

            // Get token
            const token = await authService.getAccessToken();
            if (!token) return { success: false, error: 'Authentication token missing' };

            // Direct fetch for multipart/form-data
            const response = await fetch(`${NEW_AUTH_BASE_URL}/event-days/${eventDayId}/photos`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    // Explicitly letting browser/engine handle Content-Type boundary
                },
                body: formData
            });

            const text = await response.text();

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('❌ Upload response parsing failed:', text.substring(0, 100));
                return { success: false, error: `Server Error: ${response.status} ${text.substring(0, 50)}` };
            }

            if (response.ok) {
                console.log('✅ Photo upload success');
                return { success: true, eventDay: data.eventDay || data }; // handle varying response structure
            }

            console.error('❌ Upload failed:', data.message);
            return { success: false, error: data.message || 'Upload failed' };
        } catch (error) {
            console.error('❌ Upload exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Bulk Mark Attendance (from Local Sync)
    async bulkMarkAttendance(eventDayId, userIds) {
        try {
            const response = await authService.authenticatedFetch(`${NEW_AUTH_BASE_URL}/event-days/${eventDayId}/attendance/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds, checkInMethod: 'hotspot' })
            });
            const data = await response.json();
            if (response.ok) return { success: true, count: data.count, message: data.message };
            return { success: false, error: data.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Complete Event Day (End Day)
    async completeEventDay(eventDayId) {
        try {
            const response = await authService.authenticatedFetch(`${NEW_AUTH_BASE_URL}/event-days/${eventDayId}/end`, {
                method: 'POST',
            });
            const data = await response.json();
            if (response.ok) return { success: true, eventDay: data.eventDay };
            return { success: false, error: data.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

export const eventService = new EventService();
export default eventService;
