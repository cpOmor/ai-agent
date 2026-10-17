const readline = require('readline');
const { sendMessage } = require('./gemini-service');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// In-memory conversation history
const history = [];

// ANSI color helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

console.clear();
console.log(`${colors.cyan}${colors.bold}====================================================${colors.reset}`);
console.log(`${colors.magenta}${colors.bold}   ✨ Gemini AI Interactive Chat Automation ✨       ${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}====================================================${colors.reset}`);
console.log(`${colors.gray}Commands: Type '${colors.yellow}exit${colors.gray}' to quit, '${colors.yellow}clear${colors.gray}' to reset chat history.`);
console.log(`${colors.gray}Language: Bangla (বাংলা), Banglish, English - any!${colors.reset}\n`);

rl.on('close', () => {
  process.exit(0);
});

function promptUser() {
  if (rl.closed) return;
  rl.question(`${colors.green}${colors.bold}You > ${colors.reset}`, async (input) => {
    if (rl.closed) return;
    const trimmed = input.trim();

    if (!trimmed) {
      promptUser();
      return;
    }

    if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
      console.log(`\n${colors.cyan}বিদায়! আবার দেখা হবে 👋${colors.reset}\n`);
      rl.close();
      return;
    }

    if (trimmed.toLowerCase() === 'clear' || trimmed.toLowerCase() === 'reset') {
      history.length = 0;
      console.log(`\n${colors.yellow}🧹 Chat history cleared! Fresh conversation started.${colors.reset}\n`);
      promptUser();
      return;
    }

    // Add user message to history
    history.push({
      role: 'user',
      parts: [{ text: trimmed }]
    });

    process.stdout.write(`${colors.dim}Thinking...${colors.reset}\r`);

    try {
      const response = await sendMessage(history);
      // Clear the "Thinking..." line
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);

      // Add model response to history
      history.push({
        role: 'model',
        parts: [{ text: response.text }]
      });

      console.log(`${colors.cyan}${colors.bold}Gemini (${response.model})${colors.reset}:`);
      console.log(`${response.text}\n`);
    } catch (err) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      console.log(`${colors.red}❌ Error: ${err.message}${colors.reset}\n`);
      // Remove failed user prompt so history stays in sync
      history.pop();
    }

    if (!rl.closed) {
      promptUser();
    }
  });
}

promptUser();
