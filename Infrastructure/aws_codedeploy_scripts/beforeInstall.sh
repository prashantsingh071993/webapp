#!/bin/sh
cd /home/ubuntu
sudo rm -rf node_modules latest_app package-lock.json webapp
pm2 kill
