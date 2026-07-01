/**
 * Valinc Obfuscator Presets Configuration File
 * Different intensity levels tailored to project module sensitivity
 */

module.exports = {
  // LITE PRESET: Basic renaming and encoding. Ideal for libraries/UI where performance is critical.
  lite: {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    renameGlobals: false,
    selfDefending: false,
    splitStrings: false,
    stringArray: true,
    stringArrayCallsTransform: false,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    unicodeEscapeSequence: false
  },

  // MEDIUM PRESET: Self-defending, base64/rc4 encryption, splits strings. Good for general API routes.
  medium: {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'mangled',
    log: false,
    renameGlobals: false,
    selfDefending: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayEncoding: ['base64', 'rc4'],
    stringArrayThreshold: 0.8,
    unicodeEscapeSequence: true
  },

  // ULTRA PRESET: Full flattening, anti-debugging, console disabled, RC4 encryption. Strongest defensive barrier.
  ultra: {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.6,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.6,
    debugProtection: true,
    debugProtectionInterval: 4000,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    renameGlobals: true,
    selfDefending: true,
    splitStrings: true,
    splitStringsChunkLength: 5,
    stringArray: true,
    stringArrayCallsTransform: true,
    stringArrayCallsTransformThreshold: 0.75,
    stringArrayEncoding: ['rc4'],
    stringArrayThreshold: 1.0,
    unicodeEscapeSequence: true
  }
};
