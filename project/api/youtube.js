// YouTube API proxy endpoint
// This file should be deployed to a server environment (e.g., Vercel, Netlify Functions)
// It keeps the YouTube API key secure on the server side

const axios = require('axios');

// YouTube Data API base URL
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

// API Key is loaded from environment variables - never exposed to the client
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * Handler for YouTube API proxy requests
 */
exports.handler = async function(event, context) {
  try {
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

    const path = event.path.split('/').pop();
    const params = event.queryStringParameters || {};

    // Add API key to params - the key stays server-side
    params.key = YOUTUBE_API_KEY;

    let endpoint;
    
    // Route requests to appropriate YouTube API endpoints
    switch (path) {
      case 'search':
        // Handle search requests
        endpoint = `${YOUTUBE_API_URL}/search`;
        params.part = 'snippet';
        params.type = 'video';
        params.maxResults = 10;
        break;
        
      case 'videos':
        // Handle video details requests
        endpoint = `${YOUTUBE_API_URL}/videos`;
        params.part = 'snippet,contentDetails';
        break;
        
      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Endpoint not found' })
        };
    }

    // Make the request to YouTube API with our server-side key
    const response = await axios.get(endpoint, { params });

    // Return the results to the client
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error('YouTube API proxy error:', error);
    
    return {
      statusCode: error.response?.status || 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.response?.data?.error?.message || 'Internal server error'
      })
    };
  }
}; 