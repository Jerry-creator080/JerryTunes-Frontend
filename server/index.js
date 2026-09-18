const express = require('express');
const cors = require('cors');
const ytSearch = require('youtube-sr').default;
const youtubedl = require('youtube-dl-exec');

const app = express();
const PORT = 3000;

app.use(cors());

// Health check
app.get('/', (req, res) => {
  res.send('JerryTunes Proxy Server is running!');
});

// Search Endpoint
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const results = await ytSearch.search(query, { limit: 30, type: 'video' });
    
    const tracks = results.map(video => ({
      id: video.id,
      title: video.title,
      artist: video.channel?.name || 'Unknown',
      channelId: video.channel?.id || undefined,
      artworkUrl: video.thumbnail?.url || '',
      duration: video.durationFormatted,
    }));

    res.json(tracks);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search YouTube' });
  }
});

// Search Playlists Endpoint (for Artist/Channel pages)
app.get('/api/search/playlists', async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const results = await ytSearch.search(query, { limit: 20, type: 'playlist' });
    
    const playlists = results.map(playlist => ({
      id: playlist.id,
      title: playlist.title,
      artist: playlist.channel?.name || 'Unknown',
      channelId: playlist.channel?.id || undefined,
      artworkUrl: playlist.thumbnail?.url || '',
      videoCount: playlist.videoCount || 0,
    }));

    res.json(playlists);
  } catch (error) {
    console.error('Playlist search error:', error);
    res.status(500).json({ error: 'Failed to search YouTube playlists' });
  }
});

// Stream URL Extraction Endpoint
app.get('/api/stream', async (req, res) => {
  const videoId = req.query.id;
  
  if (!videoId) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const output = await youtubedl(videoUrl, {
      dumpJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      youtubeSkipDashManifest: true
    });

    if (!output || !output.formats) {
      return res.status(500).json({ error: 'Failed to parse YouTube formats' });
    }

    // Find best audio format (m4a/mp3)
    const audioFormats = output.formats.filter(f => f.acodec !== 'none' && f.vcodec === 'none');
    
    // Sort all m4a first (for iOS compatibility), then by abr
    const bestAudio = audioFormats.sort((a, b) => {
      const aIsM4a = a.ext === 'm4a';
      const bIsM4a = b.ext === 'm4a';
      if (aIsM4a && !bIsM4a) return -1;
      if (!aIsM4a && bIsM4a) return 1;
      return (b.abr || 0) - (a.abr || 0);
    })[0];

    // Find pre-muxed video formats (with audio)
    const videoFormats = output.formats.filter(f => f.vcodec !== 'none' && f.acodec !== 'none');
    
    // Sort descending by height
    videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0));
    
    const video1080 = videoFormats.find(f => f.height === 1080 || f.height === 1440) || videoFormats[0];
    const video720 = videoFormats.find(f => f.height === 720) || videoFormats[0];
    const bestVideo = videoFormats[0];

    res.json({
      audioUrl: bestAudio?.url || output.url || null,
      videoUrl: bestVideo?.url || output.url || null,
      video720Url: video720?.url || bestVideo?.url || null,
      video1080Url: video1080?.url || bestVideo?.url || null,
    });

  } catch (error) {
    console.error('Stream extraction error:', error.message);
    res.status(500).json({ error: 'Failed to extract stream URLs' });
  }
});

app.listen(PORT, () => {
  console.log(`🎵 JerryTunes Proxy Server listening on http://localhost:${PORT}`);
});