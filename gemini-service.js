const fs = require('fs');
const path = require('path');
const config = require('./config');

function getSystemInstruction() {
  try {
    const kPath = path.join(__dirname, 'knowledge.json');
    if (fs.existsSync(kPath)) {
      const k = JSON.parse(fs.readFileSync(kPath, 'utf8'));
      return `${k.persona}

=== TRUST ONE HOSPITAL KNOWLEDGE BASE ===
${k.knowledgeText}

CRITICAL SERIAL BOOKING AUTOMATION RULES (অত্যন্ত আবশ্যক):
1. যখনই ব্যবহারকারী কোনো ডাক্তারের সিরিয়াল নিতে বা বুক করতে বলবে (যেমন: "সিরিয়াল দাও", "onar serial daw", "serial book korte chai", "সিরিয়াল লাগবে", ইত্যাদি):
   - কখনোই বলবে না "আমি সরাসরি সিরিয়াল বুক করতে পারি না"!
   - সরাসরি রোগীকে বলবে যে সিরিয়াল বুকিংয়ের জন্য নিচের তথ্যগুলো প্রয়োজন:
     ১. রোগীর নাম (Patient Name)
     ২. বয়স (Age)
     ৩. মোবাইল নম্বর (Phone Number)
     (যদি নির্দিষ্ট ডাক্তারের নাম আগে বলা না থাকে তবে ডাক্তারের নাম জানতে চাইবে)।
2. ব্যবহারকারী যখন এই তথ্যগুলো (নাম, বয়স, মোবাইল নম্বর) প্রদান করবে:
   - সাথে সাথে একটি সুন্দর সিরিয়াল বুকিং ফরম্যাট সাজিয়ে দেবে।
   - এবং ট্রাস্ট ওয়ান হসপিটালের অফিসিয়াল হোয়াটসঅ্যাপ হেল্পডেস্কে (+8801895613801) পাঠানোর জন্য সরাসরি ক্লিকেবল লিংক দেবে।
   - লিংকটির ফরম্যাট:
     [📲 হোয়াটসঅ্যাপে সিরিয়াল বুকিং পাঠান](https://wa.me/8801895613801?text=URL_ENCODED_MESSAGE)
     (যেখানে text প্যারামিটারে বাংলা মেসেজটি URL encoded থাকবে যেমন রোগীর নাম, বয়স, ফোন, ডাক্তারের নাম ও সময়)।
3. পরিচয়: 'তুমি কে?' বা 'tumi k?' জিজ্ঞেস করলে বলবে: 'আমি ট্রাস্ট ওয়ান হসপিটাল (Trust One Hospital)-এর স্মার্ট এআই অ্যাসিস্ট্যান্ট (Alpo Agent)।'
4. ভাষা: ব্যবহারকারী যে ভাষায় প্রশ্ন করবে (বাংলা, বাংলিশ বা ইংলিশ), সুন্দর ও আন্তরিক ভাষায় উত্তর দেবে।`;
    }
  } catch (e) {
    console.error('Error reading knowledge.json:', e.message);
  }
  return config.SYSTEM_INSTRUCTION;
}

/**
 * Sends a chat request to Gemini API with automatic model fallback.
 * @param {Array<{role: string, parts: Array<{text: string}>}>} history - Multi-turn chat history
 * @param {string} [customInstruction] - Optional override instruction
 * @returns {Promise<{text: string, model: string}>}
 */
async function sendMessage(history, customInstruction) {
  let lastError = null;
  const sysText = customInstruction || getSystemInstruction();

  for (const model of config.MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.API_KEY}`;
      
      const payload = {
        contents: history,
        systemInstruction: {
          parts: [{ text: sysText }]
        },
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return {
          text: data.candidates[0].content.parts[0].text,
          model: model
        };
      }

      const errMsg = data.error?.message || `HTTP ${response.status}: ${JSON.stringify(data)}`;
      // If 503 (high demand) or 404 (model unavailable), try next model
      lastError = new Error(`Model ${model} failed: ${errMsg}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed to respond.');
}

module.exports = { sendMessage };
