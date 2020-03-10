#!/bin/sh
cd /home/ubuntu
sudo mv webapp /home/ubuntu/running_webapp
cd running_webapp
ls -al
cd webapp
sudo npm install
mkdir vars
cp /etc/profile.d/custom.sh /home/ubuntu/running_webapp/webapp/vars/
cd /home/ubuntu/running_webapp/webapp/vars
chmod 700 custom.sh
cd ..
ls -al
