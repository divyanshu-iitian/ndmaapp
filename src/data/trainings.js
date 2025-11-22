// Seed data for trainings used across the app
// Status can be: 'approved' | 'pending' | 'rejected'

export const seedTrainings = [
  {
    id: 't1',
    title: 'Flood Preparedness Workshop',
    date: '2025-10-14',
    district: 'Bilaspur, Chhattisgarh',
    participants: 48,
    status: 'approved',
    theme: 'Flood',
    location: { latitude: 22.0797, longitude: 82.1391 },
    trainerName: 'Divyanshu',
  },
  {
    id: 't2',
    title: 'Earthquake Readiness Drill',
    date: '2025-10-18',
    district: 'Raipur, Chhattisgarh',
    participants: 35,
    status: 'pending',
    theme: 'Earthquake',
    location: { latitude: 21.2514, longitude: 81.6296 },
    trainerName: 'Divyanshu',
  },
  {
    id: 't3',
    title: 'Urban Fire Safety Awareness',
    date: '2025-09-30',
    district: 'Korba, Chhattisgarh',
    participants: 62,
    status: 'approved',
    theme: 'Fire',
    location: { latitude: 22.3452, longitude: 82.6963 },
    trainerName: 'Divyanshu',
  },
];

export const statusColors = {
  approved: '#4CAF50', // Emerald Green
  pending: '#F57C00', // Orange
  rejected: '#E53935', // Red
};
