const fetch = require('node-fetch').default;
const createTestOrganizer = require('./createTestOrganizer');

// Import FormData for Node.js environment
const FormData = require('form-data');

async function loginTestOrganizer(username, password) {
  try {
    console.log(`Attempting to log in test organizer: ${username}`);
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Test organizer logged in successfully.');
      return data.token; // Assuming the login returns a token
    } else {
      console.error('Failed to log in test organizer:', data.message || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('Error during test organizer login:', error);
    return null;
  }
}

async function createTestTournament() {
  let token;

  // Try to log in the existing test organizer
  token = await loginTestOrganizer('test', 'test'); // Use the default test credentials

  if (!token) {
    console.log('Login failed. Attempting to register new test organizer...');
    token = await createTestOrganizer(); // This will also log in and return token
    if (!token) {
      console.error('Failed to get organizer token. Exiting.');
      return;
    }
    console.log('New organizer registered and logged in.');
  }

  const tournamentData = {
    name: '燕云第一届武道大会',
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Starts tomorrow
    registration_deadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // Registration closes in 12 hours
    min_players: 10,
    max_players: 48,
    event_description: '这是一场测试比赛，旨在测试系统功能。欢迎所有玩家参与！',
    wechat_qr_code_url: '', // Optional, leave empty for now
    // prize_settings: {}, // Temporarily removed, will add back later
  };

  // Create FormData object
  const formData = new FormData();
  for (const key in tournamentData) {
    if (Object.prototype.hasOwnProperty.call(tournamentData, key)) {
      formData.append(key, tournamentData[key]);
    }
  }

  try {
    console.log('Attempting to create test tournament...');
    const response = await fetch('http://localhost:3000/api/tournaments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData, // Send FormData object
    });

    if (!response.ok) {
      const errorText = await response.text(); // Get raw text if not OK
      console.error('Failed to create test tournament. Response:', errorText);
      return;
    }

    const data = await response.json(); // Only parse JSON if response is OK

    console.log('Test tournament created successfully:', data);
  } catch (error) {
    console.error('Error during test tournament creation:', error);
  }
}

// Allow this script to be run directly
if (require.main === module) {
  createTestTournament();
}