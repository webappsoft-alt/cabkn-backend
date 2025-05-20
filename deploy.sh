#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# VPS details
VPS_HOST="85.31.238.45"
VPS_USER="root"
REMOTE_DIR="/root/RiderAppBackend"  # Changed path to a more standard location
PM2_APP_NAME="server2"

# Check if git status is clean
if [[ -n $(git status -s) ]]; then
  echo -e "${YELLOW}Warning: You have uncommitted changes.${NC}"
  read -p "Do you want to continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment aborted.${NC}"
    exit 1
  fi
fi

# Push current changes to GitHub
echo -e "${GREEN}Pushing latest changes to GitHub...${NC}"
git add .
git commit -m "Deploying to VPS"
git push origin main

# Deploy to VPS
echo -e "${GREEN}Deploying to VPS...${NC}"
ssh ${VPS_USER}@${VPS_HOST} << EOF
  echo "Starting deployment on VPS..."
  
  # Ensure required packages are installed
  if ! command -v git &> /dev/null; then
    echo "Installing git..."
    apt-get update
    apt-get install -y git
  fi
  
  if ! command -v npm &> /dev/null; then
    echo "Installing Node.js and npm..."
    apt-get update
    apt-get install -y nodejs npm
  fi
  
  if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
  fi
  
  # Check if directory exists, if not create it and clone repo
  if [ ! -d "${REMOTE_DIR}" ]; then
    echo "Creating directory ${REMOTE_DIR}..."
    mkdir -p ${REMOTE_DIR}
    cd ${REMOTE_DIR}
    echo "Cloning repository..."
    git clone https://github.com/Jabbar540/accountingSaas.git .
  else
    cd ${REMOTE_DIR}
    # Check if it's a git repository
    if [ ! -d ".git" ]; then
      echo "Initializing git repository..."
      rm -rf * .[^.]*
      git clone https://github.com/Jabbar540/accountingSaas.git .
    else
      # Create backup branch
      git branch -f backup-before-deploy HEAD
      
      # Get latest code
      git fetch --all
      git reset --hard origin/main
    fi
  fi
  
  # Install dependencies
  echo "Installing dependencies..."
  yarn

  pm2 update
  
  # Restart application
  echo "Restarting application..."
  pm2 restart ${PM2_APP_NAME} || pm2 start index.js --name ${PM2_APP_NAME}
  
  echo "Deployment completed at \$(date)"
EOF

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Deployment completed successfully!${NC}"
else
  echo -e "${RED}Deployment failed.${NC}"
  exit 1
fi 