import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Switch,
  Modal,
  Vibration,
  Alert,
  TouchableOpacity,
} from 'react-native';
import io from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const socket = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    sensitivity: 2,
    scrollSensitivity: 1,
    smoothing: true,
  });

  // Connect to server
  useEffect(() => {
    connectToServer();
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  const connectToServer = () => {
    try {
      socket.current = io('http://10.16.3.122:3000'); // Replace with your server IP

      socket.current.on('connect', () => {
        setIsConnected(true);
        Vibration.vibrate(100);
      });

      socket.current.on('disconnect', () => {
        setIsConnected(false);
        Alert.alert('Disconnected', 'Lost connection to server');
      });

      socket.current.on('error', (error) => {
        Alert.alert('Error', error.message);
      });

      socket.current.on('settingsUpdated', (newSettings) => {
        setSettings(newSettings);
      });
    } catch (error) {
      Alert.alert('Connection Error', 'Failed to connect to server');
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Vibration.vibrate(50);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!socket.current?.connected) return;
        
        const dx = gestureState.dx / 2;
        const dy = gestureState.dy / 2;
        socket.current.emit('move', { dx, dy });
      },
      onPanResponderRelease: () => {
        Vibration.vibrate(50);
      },
    })
  ).current;

  const handleClick = (button, double = false) => {
    if (!socket.current?.connected) return;
    
    socket.current.emit('click', { button, double });
    Vibration.vibrate(50);
  };

  const handleScroll = (direction) => {
    if (!socket.current?.connected) {
      console.log('Socket not connected');
      return;
    }
    
    // Much larger scroll value for testing
    const scrollAmount = direction === 'up' ? -1 : 1;
    
    console.log(`Sending scroll event: ${direction}, amount: ${scrollAmount}`);
    socket.current.emit('scroll', { scrollAmount });
    Vibration.vibrate(50);
  };

  const updateSettings = (newSettings) => {
    if (!socket.current?.connected) return;
    
    socket.current.emit('updateSettings', newSettings);
    setSettings(newSettings);
  };

  return (
    <View style={styles.container}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <Text style={[styles.statusText, { color: isConnected ? '#4CAF50' : '#F44336' }]}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
        <TouchableOpacity onPress={() => setShowSettings(true)}>
          <Ionicons name="settings-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Main touchpad */}
      <View style={[styles.touchPad, !isConnected && styles.disabled]} {...panResponder.panHandlers}>
        <Text style={styles.touchPadText}>Touch Pad</Text>
      </View>

      {/* Scroll Buttons */}
      <View style={styles.scrollButtons}>
  <TouchableOpacity 
    style={styles.scrollButton}
    onPress={() => {
      console.log('Scroll Up pressed');
      handleScroll('up');
    }}
  >
    <Ionicons name="chevron-up" size={30} color="white" />
    <Text style={styles.scrollButtonText}>Scroll Up</Text>
  </TouchableOpacity>

  <TouchableOpacity 
    style={styles.scrollButton}
    onPress={() => {
      console.log('Scroll Down pressed');
      handleScroll('down');
    }}
  >
    <Ionicons name="chevron-down" size={30} color="white" />
    <Text style={styles.scrollButtonText}>Scroll Down</Text>
  </TouchableOpacity>
</View>

      {/* Mouse Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleClick('left')}
          onLongPress={() => handleClick('left', true)}
        >
          <Text style={styles.buttonText}>Left Click</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => handleClick('right')}
        >
          <Text style={styles.buttonText}>Right Click</Text>
        </TouchableOpacity>
      </View>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Settings</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Mouse Sensitivity</Text>
            <View style={styles.settingButtons}>
              <TouchableOpacity 
                style={styles.settingButton}
                onPress={() => updateSettings({ ...settings, sensitivity: Math.max(1, settings.sensitivity - 0.5) })}
              >
                <Text style={styles.settingButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.settingValue}>{settings.sensitivity}x</Text>
              <TouchableOpacity 
                style={styles.settingButton}
                onPress={() => updateSettings({ ...settings, sensitivity: Math.min(4, settings.sensitivity + 0.5) })}
              >
                <Text style={styles.settingButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Mouse Smoothing</Text>
            <Switch
              value={settings.smoothing}
              onValueChange={(value) => updateSettings({ ...settings, smoothing: value })}
            />
          </View>

          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowSettings(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 40,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  touchPad: {
    flex: 1,
    backgroundColor: '#2C2C2C',
    margin: 20,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  touchPadText: {
    color: '#666',
    fontSize: 18,
  },
  scrollButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  scrollButton: {
    backgroundColor: '#2C2C2C',
    padding: 15,
    borderRadius: 10,
    width: '45%',
    alignItems: 'center',
  },
  scrollButtonText: {
    color: 'white',
    marginTop: 5,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#2C2C2C',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  modalView: {
    margin: 20,
    backgroundColor: '#2C2C2C',
    borderRadius: 20,
    padding: 35,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingLabel: {
    color: 'white',
    fontSize: 16,
  },
  settingButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
    justifyContent: 'space-between',
  },
  settingButton: {
    backgroundColor: '#404040',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingButtonText: {
    color: 'white',
    fontSize: 20,
  },
  settingValue: {
    color: 'white',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#404040',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
});