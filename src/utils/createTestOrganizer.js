const fetch = require('node-fetch').default;

async function createTestOrganizer() {
  const organizerData = {
    username: 'test',
    password: 'test',
    game_id: '0101234567',
    character_name: '燕子',
    role: 'organizer',
    stream_url: 'https://live.douyin.com/test_stream'
  };

  try {
    console.log('Attempting to register test organizer...');
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(organizerData),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Test organizer registered successfully:', data);
      return data.token; // Assuming the registration returns a token
    } else {
      console.error('Failed to register test organizer:', data.message || 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('Error during test organizer registration:', error);
    return null;
  }
}

// Allow this script to be run directly
if (require.main === module) {
  createTestOrganizer();
}

module.exports = createTestOrganizer;
