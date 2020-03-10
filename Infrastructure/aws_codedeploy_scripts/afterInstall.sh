#!/bin/sh
cd /home/ubuntu
sudo mkdir running_webapp
cp webapp /running_webapp/
cd running_webapp/webapp
sudo npm install --save bcrypt
sudo npm install

