# Sherlock
Web Server with Static Page Serve and Modular API Functionality

### Installation
**macOS**
```bash
brew install pkg-config cairo libpng jpeg giflib ffmpeg
npm install
```

**Ubuntu**
```bash
sudo apt install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential ffmpeg g++
sudo npm install
```

### Run
**macOS**
```bash
sudo npm start
```

**Ubuntu**
```bash
sudo setcap cap_net_bind_service=+ep /usr/local/bin/node
npm start
```
