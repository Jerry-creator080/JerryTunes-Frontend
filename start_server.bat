@echo off
title JerryTunes Backend Proxy Server (Port 3001)
echo ========================================================
echo   JerryTunes Audio/Stream Backend Proxy Server
echo   Listening on http://0.0.0.0:3001
echo ========================================================
node --dns-result-order=ipv4first --max-http-header-size=80000 server/index.js
pause

