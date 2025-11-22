import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  trainings: 'ndma.trainings',
  pendingQueue: 'ndma.pendingQueue',
  onlineFlag: 'ndma.onlineFlag',
  liveTrainingLocation: 'ndma.liveTrainingLocation', // Current live training coordinates
  previousTrainingLocations: 'ndma.previousTrainingLocations', // History of training locations
  trainingReports: 'ndma.trainingReports', // Training effectiveness reports
};

export async function getTrainings() {
  const raw = await AsyncStorage.getItem(KEYS.trainings);
  return raw ? JSON.parse(raw) : [];
}

export async function setTrainings(trainings) {
  await AsyncStorage.setItem(KEYS.trainings, JSON.stringify(trainings));
}

export async function getPendingQueue() {
  const raw = await AsyncStorage.getItem(KEYS.pendingQueue);
  return raw ? JSON.parse(raw) : [];
}

export async function setPendingQueue(queue) {
  await AsyncStorage.setItem(KEYS.pendingQueue, JSON.stringify(queue));
}

export async function isOnline() {
  const raw = await AsyncStorage.getItem(KEYS.onlineFlag);
  return raw ? JSON.parse(raw) : false;
}

export async function setOnline(flag) {
  await AsyncStorage.setItem(KEYS.onlineFlag, JSON.stringify(!!flag));
}

// Add a training record locally and push to pending queue if offline
export async function addTrainingLocal(training) {
  const trainings = await getTrainings();
  trainings.push(training);
  await setTrainings(trainings);

  const online = await isOnline();
  if (!online) {
    const queue = await getPendingQueue();
    queue.push({ type: 'ADD_TRAINING', payload: training });
    await setPendingQueue(queue);
  }

  return training;
}

// Simulated sync: clears the queue and marks trainings as synced
export async function trySync() {
  const online = await isOnline();
  if (!online) return { synced: false, count: 0 };

  const queue = await getPendingQueue();
  if (queue.length === 0) return { synced: true, count: 0 };

  // In a real app, POST to API then clear queue
  await setPendingQueue([]);
  return { synced: true, count: queue.length };
}

// Live training location management
export async function getLiveTrainingLocation() {
  const raw = await AsyncStorage.getItem(KEYS.liveTrainingLocation);
  return raw ? JSON.parse(raw) : null;
}

export async function setLiveTrainingLocation(location) {
  // Before setting new live location, archive current to previous
  const current = await getLiveTrainingLocation();
  if (current) {
    await addToPreviousTrainingLocations(current);
  }
  
  await AsyncStorage.setItem(KEYS.liveTrainingLocation, JSON.stringify(location));
}

export async function getPreviousTrainingLocations() {
  const raw = await AsyncStorage.getItem(KEYS.previousTrainingLocations);
  return raw ? JSON.parse(raw) : [];
}

async function addToPreviousTrainingLocations(location) {
  const previous = await getPreviousTrainingLocations();
  previous.unshift({ ...location, archivedAt: new Date().toISOString() });
  await AsyncStorage.setItem(KEYS.previousTrainingLocations, JSON.stringify(previous.slice(0, 50))); // Keep last 50
}

// Training Reports Management
export async function getTrainingReports() {
  console.log('🔍 Getting training reports from key:', KEYS.trainingReports);
  const raw = await AsyncStorage.getItem(KEYS.trainingReports);
  const reports = raw ? JSON.parse(raw) : [];
  console.log('📦 Retrieved', reports.length, 'reports');
  return reports;
}

export async function saveTrainingReports(reports) {
  console.log('💾 Saving', reports.length, 'reports to key:', KEYS.trainingReports);
  await AsyncStorage.setItem(KEYS.trainingReports, JSON.stringify(reports));
  console.log('✅ Reports saved successfully');
}

export async function addTrainingReport(report) {
  console.log('➕ Adding new training report:', report.id);
  const reports = await getTrainingReports();
  reports.push(report);
  await saveTrainingReports(reports);
  console.log('✅ Report added. Total reports now:', reports.length);
  return report;
}
