const http = require('http');

const queries = ['arijit', 'arijit singh', 'tame impala', 'ari'];

async function testAll() {
  for (const q of queries) {
    await new Promise((resolve) => {
      http.get(`http://127.0.0.1:3000/api/search?q=${encodeURIComponent(q)}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
              console.log(`[PASS] "${q}" -> ${parsed.length} tracks. First: ${parsed[0]?.title} [${parsed[0]?.duration}]`);
            } else {
              console.log(`[FAIL] "${q}" -> ${data}`);
            }
          } catch(e) {
            console.log(`[FAIL] JSON Parse error for "${q}": ${e.message}`);
          }
          resolve();
        });
      });
    });
  }
}
testAll();
