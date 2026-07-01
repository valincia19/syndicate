/**
 * VALINC SYNDICATE - Secure Obfuscation AST Engine
 * Coordinates Babel parsing, AST module traversal, and code generation.
 */

const parser = require('@babel/parser');
const generate = require('@babel/generator').default;

// Load modular transformation modules
const stringEncryption = require('./modules/stringEncryption');
const controlFlow = require('./modules/controlFlow');
const antiDebugging = require('./modules/antiDebugging');
const selfDefending = require('./modules/selfDefending');
const memoryProtection = require('./modules/memoryProtection');

const modules = [
  stringEncryption,
  controlFlow,
  antiDebugging,
  selfDefending,
  memoryProtection
];

class ObfuscationEngine {
  constructor(config = {}) {
    this.config = {
      stringEncryption: true,
      controlFlow: true,
      antiDebugging: true,
      selfDefending: true,
      memoryProtection: true,
      ...config
    };
  }

  obfuscate(sourceCode, options = {}) {
    // 1. Parse source code to AST
    const ast = parser.parse(sourceCode, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'classProperties']
    });

    // 2. Execute each enabled security transformation module
    for (const module of modules) {
      const isEnabled = this.config[module.name];
      if (isEnabled) {
        module.run(ast, options);
      }
    }

    // 3. Generate final compiled code from obfuscated AST
    const { code } = generate(ast, {
      compact: true,
      comments: false,
      minified: true
    }, sourceCode);

    return code;
  }
}

module.exports = ObfuscationEngine;
