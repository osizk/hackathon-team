// ElevenLabs text to speech. The key stays on the server.
export const TTS_MODEL = 'eleven_v4';

export async function elevenTts(text, env = process.env, fetchImpl = fetch) {
  const voice = env.ELEVENLABS_VOICE_ID;
  const res = await fetchImpl(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: { 'content-type': 'application/json', 'xi-api-key': env.ELEVENLABS_API_KEY, accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: env.ELEVENLABS_MODEL || TTS_MODEL, language_code: 'th' }),
  });
  if (!res.ok) throw new Error(`elevenlabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

export const ttsReady = (env = process.env) => Boolean(env.ELEVENLABS_API_KEY && env.ELEVENLABS_VOICE_ID);
