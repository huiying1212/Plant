// Speech-to-Text Service for converting audio to text
// Uses OpenAI Whisper API

class STTService {
  constructor() {
    // Configuration
    // For local development: uses REACT_APP_OPENAI_API_KEY from .env.local
    // For production (Vercel): uses /api/stt serverless function proxy
    this.useProxy = process.env.NODE_ENV === 'production' || process.env.REACT_APP_USE_PROXY === 'true';
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY || '';
    this.apiEndpoint = this.useProxy ? '/api/stt' : 'https://api.openai.com/v1/audio/transcriptions';
    this.model = 'whisper-1';
    
    // Recording state
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  // Start recording audio
  async startRecording() {
    console.log('[STT] Starting audio recording...');
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log('[STT] Microphone access granted');
      
      // Create media recorder
      // Try to use webm format with opus codec (widely supported)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.audioChunks = [];
      
      // Collect audio data
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          console.log('[STT] Audio chunk received:', event.data.size, 'bytes');
        }
      };
      
      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        console.log('[STT] Recording stopped');
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Handle errors
      this.mediaRecorder.onerror = (error) => {
        console.error('[STT] MediaRecorder error:', error);
      };
      
      // Start recording
      this.mediaRecorder.start();
      this.isRecording = true;
      console.log('[STT] Recording started with mimeType:', mimeType);
      
      return true;
    } catch (error) {
      console.error('[STT] Error starting recording:', error);
      throw error;
    }
  }

  // Stop recording and return audio blob
  async stopRecording() {
    console.log('[STT] Stopping audio recording...');
    
    if (!this.mediaRecorder || !this.isRecording) {
      throw new Error('No active recording');
    }
    
    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = () => {
        console.log('[STT] Recording stopped, creating audio blob');
        
        // Create audio blob from chunks
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType });
        console.log('[STT] Audio blob created:', audioBlob.size, 'bytes, type:', audioBlob.type);
        
        // Stop all tracks
        if (this.mediaRecorder.stream) {
          this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        
        this.isRecording = false;
        this.audioChunks = [];
        
        resolve(audioBlob);
      };
      
      this.mediaRecorder.onerror = (error) => {
        console.error('[STT] Error stopping recording:', error);
        reject(error);
      };
      
      // Stop the recording
      this.mediaRecorder.stop();
    });
  }

  // Convert audio to text using Whisper API
  async transcribe(audioBlob, language = 'en') {
    console.log('[STT] Transcribing audio...');
    console.log('[STT] Audio blob size:', audioBlob.size, 'bytes');
    console.log('[STT] Use proxy:', this.useProxy);
    
    // Check API key only if not using proxy
    if (!this.useProxy && !this.apiKey) {
      throw new Error('API key is not configured. Please add REACT_APP_OPENAI_API_KEY to your .env.local file');
    }
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', this.model);
      
      // Set language if specified (optional, Whisper can auto-detect)
      if (language) {
        formData.append('language', language === 'EN' ? 'en' : 'zh');
      }
      
      let response;
      
      if (this.useProxy) {
        // Use proxy endpoint (for Vercel production)
        response = await fetch(this.apiEndpoint, {
          method: 'POST',
          body: audioBlob // Send raw audio blob to proxy
        });
      } else {
        // Direct API call (for local development)
        response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: formData
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`STT API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log('[STT] Transcription result:', data.text);
      
      return data.text;
    } catch (error) {
      console.error('[STT] Transcription error:', error);
      throw error;
    }
  }

  // Cancel current recording
  cancelRecording() {
    console.log('[STT] Canceling recording...');
    
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      if (this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
      this.isRecording = false;
      this.audioChunks = [];
    }
  }

  // Check if currently recording
  getIsRecording() {
    return this.isRecording;
  }
}

// Create singleton instance
const sttServiceInstance = new STTService();

// Export the instance
export default sttServiceInstance;

