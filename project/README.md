# Yene Type - YouTube Music Typing Practice App

A typing practice application that allows you to improve your typing skills while listening to your favorite songs on YouTube.

## Features

- Search for any YouTube video and practice typing along with it
- Real-time WPM (words per minute) and accuracy statistics
- Dark/light mode support
- Multiple typing modes: Video, Practice, and Challenge
- Multi-language support

## Secure YouTube API Integration

This application uses a secure serverless function approach to hide the YouTube API key and prevent unauthorized usage. The API key is stored only on the server and never exposed to the client.

### Setup

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the YouTube Data API v3
3. Create an API key with appropriate restrictions (HTTP referrer, etc.)
4. Add the API key to your environment variables (never commit to version control)

### Development Mode (No API Key Required)

For development and testing, you can use the included mock API that doesn't require a real YouTube API key:

1. Copy `api/youtube-dev.js` to `api/youtube.js`
2. Run the serverless functions server with `npm run serve-functions`

This will provide mock YouTube search results and video details for development purposes.

### Production Mode (API Key Required)

For production deployment with real YouTube API integration:

1. Create a `.env` file in the root of the project with the following variables:

```
# YouTube API key - DO NOT COMMIT this file to version control!
YOUTUBE_API_KEY=your_youtube_api_key_here

# API proxy URL - set this to your deployed serverless function URL
# when in production, or use the local development URL
VITE_API_PROXY_URL=http://localhost:8888/.netlify/functions
```

## Troubleshooting API Issues

If you encounter "Error searching YouTube" messages:

1. Check browser console for detailed error messages
2. Verify the serverless function is running (`npm run serve-functions`)
3. Make sure the `.env` file is set up correctly (if using real API)
4. Verify your API key is valid and YouTube Data API v3 is enabled
5. Try using the development mode solution above for testing

## Development

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Start the serverless functions server: `npm run serve-functions`

## Deployment

### Netlify

This project is configured for deployment on Netlify with serverless functions.

1. Push your code to a Git repository
2. Create a new site in Netlify connected to your repository
3. Add the `YOUTUBE_API_KEY` environment variable in Netlify site settings
4. Deploy the site

### Other Hosting Providers

For other hosting providers, you'll need to adapt the serverless function setup to your provider's requirements. The key concept is to keep the YouTube API key server-side and use a proxy approach for API requests.

## Security Considerations

- The API key is never exposed in the client-side code
- Requests are proxied through serverless functions
- API key usage can be restricted by HTTP referrer in Google Cloud Console
- Rate limiting can be implemented in the serverless function 