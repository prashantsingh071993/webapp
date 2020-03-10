#!/bin/sh
cd /home/ubuntu
sudo mv webapp /home/ubuntu/running_webapp
cd running_webapp
chmod 777 webapp
ls -al
cd webapp
sudo npm install

