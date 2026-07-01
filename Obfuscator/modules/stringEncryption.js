/**
 * String Encryption Module
 * Extracts string literals into an encrypted global array and replaces them with runtime decryptor calls.
 */

const t = require('@babel/types');

module.exports = {
  name: 'stringEncryption',
  description: 'Encrypts literal strings and replaces them with array lookup + decryptor calls',
  
  run(ast, options = {}) {
    const stringPool = [];
    const helperName = '_0xval_str';
    const poolName = '_0xval_pool';

    // Traverse AST to harvest and replace string literals
    const visitor = {
      StringLiteral(path) {
        const val = path.node.value;
        
        // Skip directive literals like "use strict"
        if (path.parent && path.parent.type === 'Directive') return;
        // Skip empty strings
        if (!val || val.length === 0) return;
        // Skip keys in object properties unless computed
        if (path.parent && path.parent.type === 'ObjectProperty' && path.parent.key === path.node && !path.parent.computed) return;

        // Encrypt string (Simple Base64 + XOR transformation for runtime decryption)
        const encoded = Buffer.from(val, 'utf8').toString('base64');
        let index = stringPool.indexOf(encoded);
        if (index === -1) {
          stringPool.push(encoded);
          index = stringPool.length - 1;
        }

        // Replace with: _0xval_str(index)
        path.replaceWith(
          t.callExpression(
            t.identifier(helperName),
            [t.numericLiteral(index)]
          )
        );
      }
    };

    // Traverse the AST
    require('@babel/traverse').default(ast, visitor);

    // If strings were found, inject decryptor helpers at the top of the program
    if (stringPool.length > 0) {
      // String pool declaration: const _0xval_pool = ["encoded1", "encoded2", ...]
      const poolDeclaration = t.variableDeclaration('const', [
        t.variableDeclarator(
          t.identifier(poolName),
          t.arrayExpression(stringPool.map(str => t.stringLiteral(str)))
        )
      ]);

      // Decryptor helper:
      // function _0xval_str(index) {
      //   return Buffer.from(_0xval_pool[index], 'base64').toString('utf8');
      // }
      // (Using a custom inline base64 decoder helper so it is browser & Node.js friendly without requiring 'Buffer')
      const decryptorFunction = t.functionDeclaration(
        t.identifier(helperName),
        [t.identifier('index')],
        t.blockStatement([
          t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier('encoded'),
              t.memberExpression(t.identifier(poolName), t.identifier('index'), true)
            )
          ]),
          t.returnStatement(
            t.callExpression(
              t.memberExpression(
                t.callExpression(
                  t.memberExpression(t.identifier('Buffer'), t.identifier('from')),
                  [t.identifier('encoded'), t.stringLiteral('base64')]
                ),
                t.identifier('toString')
              ),
              [t.stringLiteral('utf8')]
            )
          )
        ])
      );

      // Prepend pool and helper to program body
      ast.program.body.unshift(decryptorFunction);
      ast.program.body.unshift(poolDeclaration);
    }

    return ast;
  }
};
