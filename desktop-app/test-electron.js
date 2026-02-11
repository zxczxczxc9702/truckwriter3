// Test what electron module returns
const electron = require('electron');
console.log('Type of electron:', typeof electron);
console.log('Electron value:', electron);
console.log('Has app:', 'app' in electron);
console.log('App value:', electron.app);
