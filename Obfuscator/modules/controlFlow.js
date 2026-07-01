/**
 * Control Flow Flattening Module
 * Flattens the execution path of block statements using a switch-case state machine inside a while loop.
 */

const t = require('@babel/types');

module.exports = {
  name: 'controlFlow',
  description: 'Flattens statement execution paths using a state machine inside a while loop',

  run(ast, options = {}) {
    const visitor = {
      BlockStatement(path) {
        const statements = path.node.body;
        
        // Only flatten blocks with at least 3 statements to keep code readable but complex
        if (statements.length < 3) return;
        
        // Skip block statements that are function bodies of constructors or very special nodes
        if (path.parent && (path.parent.type === 'ClassMethod' && path.parent.kind === 'constructor')) return;

        // Ensure we don't double-flatten or break variable scopes
        let hasUnsupported = false;
        statements.forEach(stmt => {
          if (stmt.type === 'FunctionDeclaration' || stmt.type === 'ClassDeclaration' || stmt.type === 'VariableDeclaration' && stmt.kind !== 'var') {
            // 'let' and 'const' might cause TDZ/scoping issues if moved inside case blocks
            hasUnsupported = true;
          }
        });
        if (hasUnsupported) return;

        const stateVar = path.scope.generateUidIdentifier('state');
        const cases = [];

        // Shuffle state indexes to make static analysis harder
        const indexes = Array.from({ length: statements.length }, (_, i) => i);
        // Simple seeded shuffle
        for (let i = indexes.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
        }

        // Build switch cases
        for (let i = 0; i < statements.length; i++) {
          const currentIdx = indexes[i];
          const nextIdx = (i === statements.length - 1) ? null : indexes[i + 1];
          
          const caseBody = [statements[i]];
          if (nextIdx !== null) {
            caseBody.push(
              t.expressionStatement(
                t.assignmentExpression('=', stateVar, t.numericLiteral(nextIdx))
              )
            );
          } else {
            caseBody.push(t.breakStatement()); // break out of while loop
          }

          cases.push(
            t.switchCase(
              t.numericLiteral(currentIdx),
              caseBody
            )
          );
        }

        // Sort cases by their numeric values so the code order is completely different from execution order
        cases.sort((a, b) => a.test.value - b.test.value);

        // state initialization: let _state = firstIndex;
        const stateDeclaration = t.variableDeclaration('let', [
          t.variableDeclarator(stateVar, t.numericLiteral(indexes[0]))
        ]);

        // while loop condition: while(true)
        const whileLoop = t.whileStatement(
          t.booleanLiteral(true),
          t.blockStatement([
            t.switchStatement(stateVar, cases)
          ])
        );

        // Replace block body with flattened state machine
        path.node.body = [stateDeclaration, whileLoop];
      }
    };

    require('@babel/traverse').default(ast, visitor);
    return ast;
  }
};
