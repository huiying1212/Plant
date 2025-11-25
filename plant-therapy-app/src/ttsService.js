// Text-to-Speech Service for converting LLM text responses to audio
// Uses OpenAI TTS API (gpt-4o-mini-tts model)

class TTSService {
  constructor() {
    // Configuration
    // For local development: uses REACT_APP_OPENAI_API_KEY from .env.local
    // For production (Vercel): uses /api/tts serverless function proxy
    this.useProxy = process.env.NODE_ENV === 'production' || process.env.REACT_APP_USE_PROXY === 'true';
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
    this.apiEndpoint = this.useProxy ? '/api/tts' : 'https://api.openai.com/v1/audio/speech';
    this.model = 'gpt-4o-mini-tts';
    
    // Audio queue to handle sequential playback
    this.audioQueue = [];
    this.isPlaying = false;
    this.currentAudio = null;
  }

  // Convert text to speech and return audio URL
  async textToSpeech(text, voice = 'alloy', language = 'EN') {
    // Check API key only if not using proxy
    if (!this.useProxy && !this.apiKey) {
      throw new Error('API key is not configured. Please add REACT_APP_OPENAI_API_KEY to your .env.local file');
    }

    // Select appropriate voice based on language
    // alloy: neutral, echo: male, fable: British male, onyx: deep male, nova: female, shimmer: female
    const selectedVoice = language === 'EN' ? 'nova' : 'shimmer'; // Use nova for English, shimmer for Chinese

    try {
      let response;
      
      if (this.useProxy) {
        // Use proxy endpoint (for Vercel production)
        response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: text,
            voice: selectedVoice,
            model: this.model
          })
        });
      } else {
        // Direct API call (for local development)
        response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            input: text,
            voice: selectedVoice,
            response_format: 'mp3',
            speed: 1.0
          })
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`TTS API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      // Get audio data as blob
      const audioBlob = await response.blob();
      
      // Create a URL for the audio blob
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return audioUrl;
    } catch (error) {
      console.error('TTS API Error:', error);
      throw error;
    }
  }

  // Play text as speech
  async playText(text, language = 'EN') {
    console.log('[TTS] Playing text:', text.substring(0, 50) + '...');
    console.log('[TTS] Language:', language);
    console.log('[TTS] Use proxy:', this.useProxy);
    
    try {
      // Generate audio URL
      const audioUrl = await this.textToSpeech(text, 'alloy', language);
      console.log('[TTS] Audio URL generated successfully');
      
      // Add to queue
      this.audioQueue.push(audioUrl);
      
      // Start playing if not already playing
      if (!this.isPlaying) {
        this.playNextInQueue();
      }
    } catch (error) {
      console.error('[TTS] Error playing text:', error);
      throw error;
    }
  }

  // Play next audio in queue
  playNextInQueue() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioUrl = this.audioQueue.shift();
    
    // Create audio element
    const audio = new Audio(audioUrl);
    this.currentAudio = audio;
    
    // Handle playback end
    audio.onended = () => {
      // Clean up the object URL
      URL.revokeObjectURL(audioUrl);
      this.currentAudio = null;
      
      // Play next in queue
      this.playNextInQueue();
    };
    
    // Handle errors
    audio.onerror = (error) => {
      console.error('Audio playback error:', error);
      URL.revokeObjectURL(audioUrl);
      this.currentAudio = null;
      
      // Continue with next in queue
      this.playNextInQueue();
    };
    
    // Start playback
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      URL.revokeObjectURL(audioUrl);
      this.currentAudio = null;
      this.playNextInQueue();
    });
  }

  // Stop current playback and clear queue
  stop() {
    console.log('[TTS] Stopping all audio playback');
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      console.log('[TTS] Current audio stopped');
    }
    
    // Clear queue and revoke all URLs
    if (this.audioQueue.length > 0) {
      console.log('[TTS] Clearing queue with', this.audioQueue.length, 'items');
      this.audioQueue.forEach(url => {
        URL.revokeObjectURL(url);
      });
      this.audioQueue = [];
    }
    this.isPlaying = false;
  }

  // Pause current playback
  pause() {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
  }

  // Resume playback
  resume() {
    if (this.currentAudio) {
      this.currentAudio.play().catch(error => {
        console.error('Error resuming audio:', error);
      });
    }
  }
}

// Create singleton instance
const ttsServiceInstance = new TTSService();

// Export the instance
export default ttsServiceInstance;

