// ElevenLabs text to speech. The key stays on the server.
// Default voice: "Jessica" (premade, multilingual; speaks Thai with eleven_v4).
export const DEFAULT_VOICE = 'cgSgspJ2msm6clMCkdW9';
export const DEFAULT_MODEL = 'eleven_v4';

export const voiceSettings = (env = process.env) => ({
  voice: env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE,
  model: env.ELEVENLABS_MODEL || DEFAULT_MODEL,
});

export async function elevenTts(text, env = process.env, fetchImpl = fetch) {
  const { voice, model } = voiceSettings(env);
  const res = await fetchImpl(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    signal: AbortSignal.timeout(20000),
    headers: { 'content-type': 'application/json', 'xi-api-key': env.ELEVENLABS_API_KEY, accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: model, language_code: 'th' }),
  });
  if (!res.ok) throw new Error(`elevenlabs ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export const ttsReady = (env = process.env) => Boolean(env.ELEVENLABS_API_KEY);
