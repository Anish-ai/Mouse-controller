const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const robot = require('robotjs');

class TouchpadServer {
  constructor(port = 3000) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    this.port = port;
    
    // Store mouse settings
    this.settings = {
      sensitivity: 2,
      scrollSensitivity: 1,
      smoothing: true
    };

    // Initialize server
    this.setupSocketHandlers();
    this.setupRoutes();
    this.debug = true;
  }

  setupRoutes() {
    // Add basic health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy' });
    });

    // Endpoint to get/update settings
    this.app.get('/settings', (req, res) => {
      res.json(this.settings);
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle mouse movement with smoothing
      socket.on('move', (data) => {
        try {
          const { dx, dy } = data;
          const mouse = robot.getMousePos();
          const scaledDx = dx * this.settings.sensitivity;
          const scaledDy = dy * this.settings.sensitivity;

          if (this.settings.smoothing) {
            this.smoothMove(mouse.x + scaledDx, mouse.y + scaledDy);
          } else {
            robot.moveMouse(mouse.x + scaledDx, mouse.y + scaledDy);
          }
        } catch (error) {
          console.error('Error handling mouse movement:', error);
          socket.emit('error', { message: 'Failed to move mouse' });
        }
      });

      // Handle mouse clicks with double-click support
      socket.on('click', (data) => {
        try {
          const { button, double } = data;
          if (double) {
            robot.mouseClick(button);
            setTimeout(() => robot.mouseClick(button), 100);
          } else {
            robot.mouseClick(button);
          }
        } catch (error) {
          console.error('Error handling mouse click:', error);
          socket.emit('error', { message: 'Failed to click mouse' });
        }
      });

      // Handle scrolling with improved sensitivity
      socket.on('scroll', (data) => {
        try {
          const { scrollAmount } = data;
          console.log(`Received scroll event with amount: ${scrollAmount}`);

          // Try a much larger scroll value
          const finalScrollAmount = scrollAmount * 100;
          
          console.log(`Attempting to scroll with amount: ${finalScrollAmount}`);
          
          // Try both scroll methods
          try {
            // Method 1: Using scrollMouse
            robot.scrollMouse(0, finalScrollAmount);
            console.log('Scrolled using scrollMouse');
          } catch (scrollError) {
            console.error('Error with scrollMouse:', scrollError);
            
            // Method 2: Alternative scroll method using key simulation
            try {
              if (scrollAmount > 0) {
                robot.keyTap('pagedown');
              } else {
                robot.keyTap('pageup');
              }
              console.log('Scrolled using key simulation');
            } catch (keyError) {
              console.error('Error with key simulation:', keyError);
            }
          }
        } catch (error) {
          console.error('Error handling scroll:', error);
          socket.emit('error', { message: 'Failed to scroll: ' + error.message });
        }
      });

      // Handle drag operations
      socket.on('drag', (data) => {
        try {
          const { start, end } = data;
          robot.mouseToggle('down');
          robot.dragMouse(end.x, end.y);
          robot.mouseToggle('up');
        } catch (error) {
          console.error('Error handling drag:', error);
          socket.emit('error', { message: 'Failed to drag' });
        }
      });

      // Handle settings updates
      socket.on('updateSettings', (newSettings) => {
        this.settings = { ...this.settings, ...newSettings };
        socket.emit('settingsUpdated', this.settings);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  smoothMove(targetX, targetY) {
    const mouse = robot.getMousePos();
    const steps = 5;
    const dx = (targetX - mouse.x) / steps;
    const dy = (targetY - mouse.y) / steps;

    for (let i = 1; i <= steps; i++) {
      setTimeout(() => {
        robot.moveMouse(
          Math.round(mouse.x + dx * i),
          Math.round(mouse.y + dy * i)
        );
      }, i * (1000 / 60)); // 60fps-like smoothing
    }
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`Touchpad server running on http://localhost:${this.port}`);
      console.log('Make sure to update the client with the correct IP address');
    });
  }
}

// Create and start server
const server = new TouchpadServer();
server.start();