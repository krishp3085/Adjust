import { initialize, requestPermission, readRecords } from 'react-native-health-connect';

// Request permissions for both sleep and heart rate data
export const requestSleepAndHeartRatePermissions = async () => {

	// Initialize the Health Connect SDK
	const isInitialized = await initialize();
	if (!isInitialized) {
		throw new Error('Health Connect initialization failed');
	}

	// Request permission for sleep and heart rate data
	const grantedPermissions = await requestPermission([
		{ accessType: 'read', recordType: 'SleepSession' },
		{ accessType: 'read', recordType: 'HeartRate' },
	]);
	console.log('Granted permissions: ', grantedPermissions);
	return grantedPermissions;
};

// Fetch sleep data from the specified number of days ago to now
export const fetchSleepData = async (days: number) => {
	const now = new Date();
	const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
	const endTime = now.toISOString();

	// Read sleep records
	const { records } = await readRecords('SleepSession', {
		timeRangeFilter: {
			operator: 'between',
			startTime,
			endTime,
		},
	});

	return records;
};

// Fetch heart rate data from the specified number of days ago to now
export const fetchHeartRateData = async (days: number) => {
	const now = new Date();
	const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
	const endTime = now.toISOString();

	// Read heart rate records
	const { records } = await readRecords('HeartRate', {
		timeRangeFilter: {
			operator: 'between',
			startTime,
			endTime,
		},
	});

	return records;
};