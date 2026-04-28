'use strict';

var spawn  = require('child_process').spawn;
var net    = require('net');
var path   = require('path');
var fs     = require('fs');
var os     = require('os');

var PORT = 3000;
var URL  = 'http://localhost:' + PORT;
var PROJ = __dirname;

// ANSI
var G  = '\x1b[92m', C  = '\x1b[96m', Y  = '\x1b[93m', R  = '\x1b[91m';
var M  = '\x1b[95m', D  = '\x1b[2m',  B  = '\x1b[1m',  Z  = '\x1b[0m';
var CL = '\x1b[2K';

var SP     = ['◐','◓','◑','◒'];
var TICK   = '✓';
var CROSS  = '✗';
var BULLET = '●';
var DASH   = '─';
var CLOCK  = '⏱';
var ELLIP  = '…';

var fi         = 0;
var t0         = Date.now();
var serverProc = null;
var spinTimer  = null;
var stepMsg    = '';
var stepDone   = false;
var hdrStatus  = '';
var errorLines = [];

// ── Utils ─────────────────────────────────────────────────────────────────

function elapsed() {
  var s   = Math.floor((Date.now() - t0) / 1000);
  var m   = String(Math.floor(s / 60)).padStart(2, '0');
  var sec = String(s % 60).padStart(2, '0');
  return m + ':' + sec;
}

function hline() {
  var w = Math.max((process.stdout.columns || 70) - 4, 10);
  return DASH.repeat(w);
}

function goto(row) {
  process.stdout.write('\x1b[' + (row + 1) + ';1H');
}

// ── Drawing ───────────────────────────────────────────────────────────────

function redrawStep() {
  var spin = stepDone ? (G + TICK + Z) : (Y + SP[fi++ % 4] + Z);
  var msg  = stepMsg.length > 56 ? stepMsg.slice(0, 54) + ELLIP : stepMsg;
  goto(5);
  process.stdout.write(CL + '  ' + spin + '  ' + msg + '  ' + D + CLOCK + ' ' + elapsed() + Z);
}

function redrawHeader() {
  var hl = '  ' + D + hline() + Z;
  goto(0); process.stdout.write(CL + hl);
  goto(1); process.stdout.write(CL + '  ' + B + M + '⬡  Painel Troca Notas' + Z + B + C + ' — Genesis' + Z);
  goto(2); process.stdout.write(CL + '  ' + D + 'GRU Solutions · mysql.geneslab.com.br/geld_rpa' + Z);
  goto(3); process.stdout.write(CL + hl);
  goto(4); process.stdout.write(CL + '  ' + (hdrStatus
    ? (hdrStatus === 'ATIVO'     ? G + B + BULLET + ' ' + hdrStatus + Z
     : hdrStatus === 'ERRO'      ? R + B + BULLET + ' ' + hdrStatus + Z
     : Y + B + BULLET + ' ' + hdrStatus + Z)
    : ''));
  goto(6); process.stdout.write(CL);
  goto(7); process.stdout.write(CL + '  ' + D + 'Ctrl+C para encerrar' + Z);
}

function setStep(msg, done, status) {
  stepMsg  = msg;
  stepDone = !!done;
  if (status !== undefined) { hdrStatus = status; redrawHeader(); }
  redrawStep();
}

function showErrors() {
  goto(6);
  if (errorLines.length) {
    process.stdout.write(CL + '  ' + R + errorLines.slice(-2).join(' | ').slice(0, 80) + Z);
  }
}

function waitKey() {
  clearInterval(spinTimer);
  process.stdout.write('\x1b[?25h');
  goto(9);
  process.stdout.write(CL + '  ' + D + 'Pressione qualquer tecla para fechar...' + Z);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.once('data', function() {
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.exit(1);
  });
}

// ── Port polling ──────────────────────────────────────────────────────────

function waitPort(maxMs, cb) {
  var deadline = Date.now() + maxMs;
  function attempt() {
    if (Date.now() > deadline) { cb(false); return; }
    var sock = net.createConnection({ host: '127.0.0.1', port: PORT });
    sock.setTimeout(500);
    sock.once('connect', function() { sock.destroy(); cb(true); });
    sock.once('error',   function() { sock.destroy(); setStep('Aguardando Next.js na porta ' + PORT + ELLIP); setTimeout(attempt, 400); });
    sock.once('timeout', function() { sock.destroy(); setTimeout(attempt, 300); });
  }
  attempt();
}

// ── Cleanup ───────────────────────────────────────────────────────────────

function cleanup() {
  clearInterval(spinTimer);
  if (serverProc && !serverProc.killed) {
    try {
      // mata o grupo de processos (Next.js abre filhos)
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(serverProc.pid), '/f', '/t'], { stdio: 'ignore' });
      } else {
        serverProc.kill('SIGTERM');
      }
    } catch (e) {}
  }
  process.stdout.write('\x1b[?25h');
  goto(11); process.stdout.write('\n');
}

process.on('SIGINT',  function() { cleanup(); process.exit(0); });
process.on('SIGTERM', function() { cleanup(); process.exit(0); });
process.on('exit',    cleanup);
process.on('uncaughtException', function(err) {
  clearInterval(spinTimer);
  process.stdout.write('\x1b[?25h');
  goto(5);  process.stdout.write(CL + '  ' + R + CROSS + ' ' + err.message + Z);
  goto(6);  process.stdout.write(CL + '  ' + D + (err.stack || '').split('\n')[1] + Z);
  hdrStatus = 'ERRO'; redrawHeader();
  waitKey();
});

// ── Main ──────────────────────────────────────────────────────────────────

process.stdout.write('\x1b[2J\x1b[H\x1b[?25l');
redrawHeader();
setStep('Iniciando' + ELLIP);
spinTimer = setInterval(function() { redrawStep(); }, 120);

// Passo 1 — verifica node_modules
setTimeout(function() {
  var needsInstall = !fs.existsSync(path.join(PROJ, 'node_modules', 'next'));

  // Libera a porta antes de iniciar
  setStep('Liberando porta ' + PORT + ELLIP);
  killPort(function() {

  if (needsInstall) {
    setStep('Instalando dependências (aguarde ~1 minuto)' + ELLIP, false, 'INSTALANDO');

    var install = spawn('npm', ['install'], {
      cwd:   PROJ,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    install.stdout.on('data', function(d) {
      var line = d.toString().trim().split('\n').pop();
      if (line) setStep(line.slice(0, 56));
    });
    install.stderr.on('data', function(d) {
      var line = d.toString().trim().split('\n').filter(function(l) {
        return l && !l.startsWith('npm warn');
      }).pop();
      if (line) setStep(line.slice(0, 56));
    });

    install.on('close', function(code) {
      if (code !== 0) {
        clearInterval(spinTimer);
        setStep(CROSS + ' npm install falhou (código ' + code + ')', false, 'ERRO');
        waitKey(); return;
      }
      startServer();
    });
  } else {
    startServer();
  }

  }); // fim killPort

}, 300);

// ── Mata processo antigo na porta ────────────────────────────────────────

function killPort(cb) {
  if (process.platform !== 'win32') { cb(); return; }
  // Usa wmic (não bloqueado por antivírus) para matar todos os node.exe
  // que estejam rodando next dev neste diretório
  var killer = spawn('wmic', [
    'process', 'where',
    'name="node.exe" and commandline like "%next%"',
    'delete'
  ], { stdio: 'ignore', shell: false });
  killer.on('close', function() { setTimeout(cb, 800); });
  killer.on('error', function() { setTimeout(cb, 800); });
}

// ── Inicia Next.js ────────────────────────────────────────────────────────

function startServer() {
  setStep('Iniciando servidor Next.js' + ELLIP, false, 'INICIANDO');

  var logPath = path.join(os.tmpdir(), 'painel-genesis.log');
  var logFd   = fs.openSync(logPath, 'w');

  serverProc = spawn('npm', ['run', 'dev'], {
    cwd:      PROJ,
    shell:    true,
    stdio:    ['ignore', logFd, logFd],
    detached: false
  });
  fs.closeSync(logFd);

  serverProc.on('error', function(err) { errorLines.push(err.message); });

  // Lê o log em busca de erros enquanto aguarda porta
  var logWatcher = setInterval(function() {
    try {
      var log  = fs.readFileSync(logPath, 'utf8');
      var lines = log.trim().split('\n').filter(Boolean);
      var last  = lines[lines.length - 1] || '';
      // mostra progresso de compilação do Next.js
      if (last.includes('compiling') || last.includes('compiled') || last.includes('error')) {
        setStep(last.replace(/\x1b\[[0-9;]*m/g, '').slice(0, 56));
      }
    } catch (e) {}
  }, 500);

  setTimeout(function() {
    setStep('Aguardando Next.js' + ELLIP);

    // Detecta a porta real lendo o log (Next.js pode usar 3001, 3002, etc.)
    function detectPort(deadline, done) {
      if (Date.now() > deadline) { done(null); return; }
      try {
        var log = fs.readFileSync(logPath, 'utf8');
        var m = log.match(/Local:\s+http:\/\/localhost:(\d+)/);
        if (m) { done(Number(m[1])); return; }
      } catch (e) {}
      setTimeout(function() { detectPort(deadline, done); }, 400);
    }

    detectPort(Date.now() + 90000, function(actualPort) {
      clearInterval(logWatcher);

      if (!actualPort || serverProc.exitCode !== null) {
        clearInterval(spinTimer);
        try {
          var log = fs.readFileSync(logPath, 'utf8');
          errorLines = log.replace(/\x1b\[[0-9;]*m/g, '')
                          .trim().split('\n').filter(Boolean).slice(-3);
        } catch (e) {}
        setStep(R + CROSS + Z + ' Next.js não respondeu em 90s', false, 'ERRO');
        showErrors();
        waitKey(); return;
      }

      var actualURL = 'http://localhost:' + actualPort;

      // Abre navegador na porta correta
      setStep('Abrindo navegador na porta ' + actualPort + ELLIP);
      spawn('cmd', ['/c', 'start', '', actualURL], {
        detached: true, stdio: 'ignore', shell: false
      }).unref();

      setTimeout(function() {
        clearInterval(spinTimer);
        setStep('Rodando em ' + G + URL + Z, true, 'ATIVO');

        // Monitora se o servidor cair
        spinTimer = setInterval(function() {
          if (serverProc.exitCode !== null) {
            clearInterval(spinTimer);
            setStep(R + CROSS + Z + ' Servidor encerrado (código: ' + serverProc.exitCode + ')', false, 'ENCERRADO');
            try {
              var log = fs.readFileSync(logPath, 'utf8');
              errorLines = log.replace(/\x1b\[[0-9;]*m/g, '')
                              .trim().split('\n').filter(Boolean).slice(-3);
            } catch (e) {}
            showErrors();
            waitKey();
          }
        }, 1500);
      }, 600);
    });
  }, 800);
}
