#!/bin/sh
cd /home/ubuntu
sudo mkdir running_webapp
cp -r webapp /home/ubuntu/running_webapp/
cd /home/ubuntu/running_webapp/webapp
pwd
sudo npm install --save bcrypt
sudo npm install

