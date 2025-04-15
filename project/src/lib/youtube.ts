import axios from 'axios';

export interface YouTubeSearchResult {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}

// YouTube Data API v3 endpoint
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || 'AIzaSyAlRPh0To8uQYIPl-zA64GSqAnrjR6WYZM';
const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

/**
 * Search for videos on YouTube using the Data API v3
 */
export const searchYouTubeVideos = async (query: string): Promise<YouTubeSearchResult[]> => {
  console.log(`Searching YouTube for: "${query}"`);
  
  try {
    const response = await axios.get(`${API_BASE_URL}/search`, {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: 10,
        key: API_KEY
      }
    });
    
    if (!response.data.items || !Array.isArray(response.data.items)) {
      throw new Error('Invalid response format from YouTube API');
    }
    
    const results = response.data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url
    }));
    
    console.log(`Found ${results.length} results from YouTube API`);
    return results;
    
  } catch (error) {
    console.error('Error searching YouTube:', error);
    throw new Error('Failed to search YouTube. Please try again later.');
  }
};

/**
 * Get video details by ID using YouTube Data API v3
 */
export const getVideoDetails = async (videoId: string): Promise<YouTubeSearchResult> => {
  console.log(`Getting details for video: ${videoId}`);
  
  try {
    const response = await axios.get(`${API_BASE_URL}/videos`, {
      params: {
        part: 'snippet',
        id: videoId,
        key: API_KEY
      }
    });
    
    if (!response.data.items || !response.data.items[0]) {
      throw new Error('Video not found');
    }
    
    const item = response.data.items[0];
    return {
      id: item.id,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url
    };
  } catch (error) {
    console.error('Error getting video details:', error);
    throw new Error('Failed to get video details. Please try again later.');
  }
};