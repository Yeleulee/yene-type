const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

export async function searchVideos(query: string): Promise<YouTubeVideo[]> {
  try {
    const response = await fetch(
      `${YOUTUBE_API_URL}/search?part=snippet&q=${encodeURIComponent(
        query
      )}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch videos');
    }

    const data = await response.json();
    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      channelTitle: item.snippet.channelTitle
    }));
  } catch (error) {
    console.error('Error searching videos:', error);
    return [];
  }
}

export async function getVideoSubtitles(videoId: string): Promise<string> {
  try {
    // Get video details including caption information
    const response = await fetch(
      `${YOUTUBE_API_URL}/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch video details');
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return 'No video details available. Start typing to practice...';
    }

    // For now, we'll use the video description as practice text since direct caption
    // download is not supported through the API
    const description = data.items[0].snippet.description;
    
    if (!description) {
      return 'No content available for this video. Start typing to practice...';
    }

    return description || 'Start typing to practice...';
  } catch (error) {
    console.error('Error fetching video details:', error);
    return 'Start typing to practice...';
  }
}