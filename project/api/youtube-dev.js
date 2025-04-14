// Development version of the YouTube API proxy
// This provides mock responses for local development without needing an actual API key

/**
 * Handler for development YouTube API proxy requests
 */
exports.handler = async function(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Simulate network delay for realistic testing
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const path = event.path.split('/').pop();
    const params = event.queryStringParameters || {};
    
    console.log(`Development API received request: ${path}`, params);

    // Route requests to appropriate mock responses
    switch (path) {
      case 'search':
        return handleSearch(params, headers);
        
      case 'videos':
        return handleVideoDetails(params, headers);
        
      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Endpoint not found' })
        };
    }
  } catch (error) {
    console.error('YouTube API proxy error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

/**
 * Handle search requests with mock data
 */
function handleSearch(params, headers) {
  const query = params.q || '';
  console.log('Search query:', query);
  
  // Mock YouTube search results
  const mockVideos = getMockVideos();
  
  // Filter videos based on search query
  const filteredVideos = mockVideos.filter(video => 
    video.title.toLowerCase().includes(query.toLowerCase()) || 
    video.channel.toLowerCase().includes(query.toLowerCase())
  );
  
  // Format response to match YouTube API format
  const response = {
    items: filteredVideos.map(video => ({
      id: { videoId: video.id },
      snippet: {
        title: video.title,
        channelTitle: video.channel,
        thumbnails: {
          default: { url: `https://img.youtube.com/vi/${video.id}/default.jpg` },
          medium: { url: `https://img.youtube.com/vi/${video.id}/mqdefault.jpg` },
          high: { url: `https://img.youtube.com/vi/${video.id}/hqdefault.jpg` }
        }
      }
    }))
  };
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response)
  };
}

/**
 * Handle video details requests with mock data
 */
function handleVideoDetails(params, headers) {
  const videoId = params.id;
  console.log('Video ID:', videoId);
  
  if (!videoId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing video ID parameter' })
    };
  }
  
  // Find the video in our mock database
  const mockVideos = getMockVideos();
  const video = mockVideos.find(v => v.id === videoId);
  
  if (!video) {
    // For unknown videos, create a generic response
    const genericVideo = {
      id: videoId,
      title: `YouTube Video (ID: ${videoId})`,
      channel: 'Unknown Channel',
      description: 'No description available.'
    };
    
    const response = {
      items: [{
        id: genericVideo.id,
        snippet: {
          title: genericVideo.title,
          channelTitle: genericVideo.channel,
          description: genericVideo.description,
          thumbnails: {
            default: { url: `https://img.youtube.com/vi/${videoId}/default.jpg` },
            medium: { url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` },
            high: { url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }
          }
        },
        contentDetails: {
          duration: 'PT4M30S'
        }
      }]
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  }
  
  // Format response to match YouTube API format
  const response = {
    items: [{
      id: video.id,
      snippet: {
        title: video.title,
        channelTitle: video.channel,
        description: video.description || 'No description available.',
        thumbnails: {
          default: { url: `https://img.youtube.com/vi/${video.id}/default.jpg` },
          medium: { url: `https://img.youtube.com/vi/${video.id}/mqdefault.jpg` },
          high: { url: `https://img.youtube.com/vi/${video.id}/hqdefault.jpg` }
        }
      },
      contentDetails: {
        duration: video.duration || 'PT4M30S'
      }
    }]
  };
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response)
  };
}

/**
 * Get mock video data for development
 */
function getMockVideos() {
  return [
    {
      id: 'dQw4w9WgXcQ',
      title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
      channel: 'Rick Astley',
      description: 'The official music video for "Never Gonna Give You Up" by Rick Astley',
      duration: 'PT3M33S'
    },
    {
      id: 'fJ9rUzIMcZQ',
      title: 'Queen - Bohemian Rhapsody (Official Video)',
      channel: 'Queen Official',
      description: 'The official "Bohemian Rhapsody" music video by Queen',
      duration: 'PT5M59S'
    },
    {
      id: 'JGwWNGJdvx8',
      title: 'Ed Sheeran - Shape of You (Official Music Video)',
      channel: 'Ed Sheeran',
      description: 'The official music video for Ed Sheeran - Shape Of You',
      duration: 'PT4M24S'
    },
    {
      id: 'kJQP7kiw5Fk',
      title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
      channel: 'Luis Fonsi',
      description: 'Music video by Luis Fonsi performing Despacito ft. Daddy Yankee',
      duration: 'PT4M42S'
    },
    {
      id: 'OPf0YbXqDm0',
      title: 'Mark Ronson - Uptown Funk (Official Video) ft. Bruno Mars',
      channel: 'Mark Ronson',
      description: 'Official Video for "Uptown Funk" by Mark Ronson ft. Bruno Mars',
      duration: 'PT4M31S'
    },
    {
      id: 'YQHsXMglC9A',
      title: 'Adele - Hello (Official Music Video)',
      channel: 'Adele',
      description: 'The official music video for Adele - Hello',
      duration: 'PT6M7S'
    },
    {
      id: '09R8_2nJtjg',
      title: 'Maroon 5 - Sugar (Official Music Video)',
      channel: 'Maroon 5',
      description: 'Music video by Maroon 5 performing Sugar',
      duration: 'PT5M1S'
    },
    {
      id: 'y6120QOlsfU',
      title: 'Darude - Sandstorm',
      channel: 'Darude',
      description: 'Music video for Darude - Sandstorm',
      duration: 'PT3M53S'
    },
    {
      id: 'lYBUbBu4W08',
      title: 'Billie Eilish - bad guy (Official Music Video)',
      channel: 'Billie Eilish',
      description: 'Listen to "bad guy" from the debut album "WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?"',
      duration: 'PT3M25S'
    },
    {
      id: '0yW7w8F2TVA',
      title: 'The Weeknd - Blinding Lights (Official Music Video)',
      channel: 'The Weeknd',
      description: 'Official music video for The Weeknd "Blinding Lights"',
      duration: 'PT4M22S'
    }
  ];
} 