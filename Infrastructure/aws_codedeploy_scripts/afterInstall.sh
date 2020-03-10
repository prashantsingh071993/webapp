#!/bin/sh
cd /home/ubuntu
sudo mv webapp /home/ubuntu/running_webapp
sudo mv /home/ubuntu/running_webapp /var/
mv /var/webapp /var/running_webapp/
cd /var
cd running_webapp
ls -al
cd webapp
sudo npm install

