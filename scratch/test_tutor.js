const apiKey = process.env.OPENROUTER_API_KEY || '';
async function test() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://nexus-career-os.app',
        'X-Title': 'Nexus Career OS - AI Tutor'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash:free',
        messages: [
          { role: 'system', content: 'You are a helpful tutor.' },
          { role: 'user', content: 'Explain what HTML is in one sentence.' }
        ]
      })
    });
    console.log("Status:", response.status);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Fetch error:", e);
  }
}
test();
