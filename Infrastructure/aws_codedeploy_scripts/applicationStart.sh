#!/bin/sh
cd /home/ubuntu/latest_app/webapp
pwd
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/home/ubuntu/cloudwatch-agent-config.json -s
pm2 start server.js
