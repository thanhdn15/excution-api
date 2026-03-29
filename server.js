const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = Number(process.env.PORT || 8787);
const MAX_BODY_BYTES = 200 * 1024;
const MAX_CODE_BYTES = 200 * 1024;
const EXEC_TIMEOUT_MS = 8000;
const MAX_STDIO_BYTES = 1024 * 1024;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', (error) => reject(error));
  });
}

function executeCode(language, code) {
  return new Promise((resolve) => {
    const lang = String(language || '').trim().toLowerCase();
    const source = String(code || '');
    const supported = {
      go: { cmd: 'go', args: ['run'], filename: 'main.go' },
      php: { cmd: 'php', args: [], filename: 'main.php' },
    };

    const spec = supported[lang];
    if (!spec) {
      resolve({ success: false, error: 'Only "go" and "php" are supported.' });
      return;
    }
    if (!source.trim()) {
      resolve({ success: false, error: 'Code is empty.' });
      return;
    }
    if (Buffer.byteLength(source, 'utf8') > MAX_CODE_BYTES) {
      resolve({ success: false, error: 'Code is too large.' });
      return;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsa-exec-'));
    const filePath = path.join(tempDir, spec.filename);

    try {
      fs.writeFileSync(filePath, source, 'utf8');
    } catch (error) {
      resolve({ success: false, error: error.message || 'Unable to write temp file.' });
      return;
    }

    execFile(
      spec.cmd,
      [...spec.args, filePath],
      {
        cwd: tempDir,
        timeout: EXEC_TIMEOUT_MS,
        maxBuffer: MAX_STDIO_BYTES,
      },
      (error, stdout, stderr) => {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
          // Best-effort cleanup only.
        }

        const out = String(stdout || '');
        const err = String(stderr || '');

        if (!error) {
          resolve({
            success: true,
            language: lang,
            stdout: out,
            stderr: err,
            exitCode: 0,
          });
          return;
        }

        const missingRuntime = error.code === 'ENOENT';
        const timedOut = error.killed || error.signal === 'SIGTERM';
        resolve({
          success: false,
          language: lang,
          stdout: out,
          stderr: err,
          exitCode: typeof error.code === 'number' ? error.code : null,
          error: missingRuntime
            ? `Runtime "${spec.cmd}" is not installed on this server.`
            : timedOut
              ? `Code execution timed out after ${EXEC_TIMEOUT_MS}ms.`
              : (err || out || error.message || 'Execution failed.'),
        });
      }
    );
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true, service: 'execution-api' });
    return;
  }

  if (req.method === 'POST' && req.url === '/execute') {
    try {
      const body = await readJsonBody(req);
      const result = await executeCode(body.language, body.code);
      sendJson(res, result.success ? 200 : 400, result);
    } catch (error) {
      sendJson(res, 400, { success: false, error: error.message || 'Bad request.' });
    }
    return;
  }

  sendJson(res, 404, { success: false, error: 'Not found.' });
});

server.listen(PORT, () => {
  console.log(`Execution API listening on http://localhost:${PORT}`);
});
