@echo off
title JerryTunes Expo Bundler (Port 8081)
echo ========================================================
echo   JerryTunes Expo Metro Bundler (SDK 58 / Expo Go)
echo   Opening on http://localhost:8081
echo ========================================================
node "node_modules/expo/bin/cli" start --go -c
pause

