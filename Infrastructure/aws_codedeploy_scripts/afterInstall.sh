#!/bin/sh
cd /var
sudo mv webapp /var/running_webapp/ 
cd running_webapp/webapp
sudo npm install
sudo npm install --save bcrypt-nodejs && sudo npm uninstall --save bcrypt
sudo npm install



