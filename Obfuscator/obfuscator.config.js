/**
 * Valinc Obfuscator Presets Configuration File
 * Allows modular control to toggle AST security modules based on preset intensity.
 */

module.exports = {
  // LITE PRESET: Only encrypts string literals to hide passwords, endpoints, and credentials.
  lite: {
    stringEncryption: true,
    controlFlow: false,
    antiDebugging: false,
    selfDefending: false,
    memoryProtection: false,
    useExternalPostProcessor: false
  },

  // MEDIUM PRESET: Encrypts strings, prevents modifications, and secures function prototypes from inspection.
  medium: {
    stringEncryption: true,
    controlFlow: false,
    antiDebugging: false,
    selfDefending: true,
    memoryProtection: true,
    useExternalPostProcessor: false
  },

  // ULTRA PRESET: Full AST transformation: Control Flow, Anti-debugging, and double-barrier post-processing.
  ultra: {
    stringEncryption: true,
    controlFlow: true,
    antiDebugging: false, // Handled safely by post-processor to prevent prototype conflicts
    selfDefending: false,   // Handled safely by post-processor to prevent prototype conflicts
    memoryProtection: false, // Handled safely by post-processor to prevent prototype conflicts
    useExternalPostProcessor: true // Enables javascript-obfuscator as post-processing layer
  }
};
