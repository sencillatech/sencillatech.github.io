const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const PUBLIC_DIR = __dirname;
const API_TARGET_PORT = 8787;
const API_TARGET_HOST = '127.0.0.1';

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'application/font-woff',
    '.woff2': 'application/font-woff2',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
};

// Check if a request path should be proxied to the local Services API Worker
function isApiProxyRoute(pathname) {
    return (
        pathname === '/search' ||
        pathname === '/autocomplete' ||
        pathname === '/requests' ||
        pathname.startsWith('/requests/') ||
        pathname === '/analytics' ||
        pathname.startsWith('/analytics/') ||
        pathname.startsWith('/api/')
    );
}

// Reverse proxy API requests to local Worker running on port 8787
function proxyToApi(req, res) {
    const options = {
        hostname: API_TARGET_HOST,
        port: API_TARGET_PORT,
        path: req.url,
        method: req.method,
        headers: {
            ...req.headers,
            host: `${API_TARGET_HOST}:${API_TARGET_PORT}`,
            'x-forwarded-for': req.socket.remoteAddress,
            'x-forwarded-proto': 'http',
            'x-forwarded-host': req.headers.host || `localhost:${PORT}`
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        // Forward response headers with CORS enabled for local dev
        const headers = { ...proxyRes.headers };
        headers['access-control-allow-origin'] = req.headers.origin || '*';
        headers['access-control-allow-credentials'] = 'true';
        headers['access-control-allow-private-network'] = 'true';

        res.writeHead(proxyRes.statusCode, headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.warn(`[Proxy Warning] Could not reach Services API at http://${API_TARGET_HOST}:${API_TARGET_PORT}:`, err.message);
        res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({
            error: 'Local Services API unavailable',
            details: `Ensure simpleitech-services-api is running on port ${API_TARGET_PORT}.`,
            hint: 'Run "npm run dev" in simpleitech-services-api or start via start-all.ps1'
        }));
    });

    req.pipe(proxyReq);
}

http.createServer((req, res) => {
    // Enable CORS preflight for all endpoints on local dev
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': req.headers.origin || '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Accept, cal-api-version, Authorization, X-Requested-With',
            'Access-Control-Allow-Private-Network': 'true',
            'Access-Control-Max-Age': '86400'
        });
        res.end();
        return;
    }

    const reqUrl = req.url.split('?')[0];

    // Proxy API routes to local Services API
    if (isApiProxyRoute(reqUrl)) {
        proxyToApi(req, res);
        return;
    }

    let filePath = path.join(PUBLIC_DIR, reqUrl === '/' ? '/index.html' : reqUrl);
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Sorry, an error occurred: ' + err.code + ' ..\n');
            }
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content, 'utf-8');
        }
    });

}).listen(PORT, () => {
    console.log(`SimpleiTech Website running at http://localhost:${PORT}/`);
    console.log(`API requests (/search, /autocomplete, /requests) will automatically proxy to http://${API_TARGET_HOST}:${API_TARGET_PORT}`);
});
