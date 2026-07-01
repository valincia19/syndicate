/**
 * Self-Defending Module
 * Crashes or hangs execution if the source code has been formatted, beautified, or modified.
 */

const t = require('@babel/types');

module.exports = {
  name: 'selfDefending',
  description: 'Prevents code modification and beautification by testing the function string representation',

  run(ast, options = {}) {
    // Generate AST for:
    // (function() {
    //   const check = function() {
    //     const testRegex = new RegExp('  |\\n|\\r'); // Detects formatting (indents or newlines)
    //     if (testRegex.test(check.toString())) {
    //       while(true) {} // infinite loop to hang execution
    //     }
    //   };
    //   check();
    // })();

    const selfDefendingRoutine = t.expressionStatement(
      t.callExpression(
        t.functionExpression(
          null,
          [],
          t.blockStatement([
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier('check'),
                t.functionExpression(
                  null,
                  [],
                  t.blockStatement([
                    t.variableDeclaration('const', [
                      t.variableDeclarator(
                        t.identifier('testRegex'),
                        t.newExpression(
                          t.identifier('RegExp'),
                          [t.stringLiteral('  |\\n|\\r')]
                        )
                      )
                    ]),
                    t.ifStatement(
                      t.callExpression(
                        t.memberExpression(t.identifier('testRegex'), t.identifier('test')),
                        [
                          t.callExpression(
                            t.memberExpression(t.identifier('check'), t.identifier('toString')),
                            []
                          )
                        ]
                      ),
                      t.blockStatement([
                        t.whileStatement(
                          t.booleanLiteral(true),
                          t.blockStatement([])
                        )
                      ])
                    )
                  ])
                )
              )
            ]),
            t.expressionStatement(
              t.callExpression(t.identifier('check'), [])
            )
          ])
        ),
        []
      )
    );

    // Prepend to program body
    ast.program.body.unshift(selfDefendingRoutine);
    return ast;
  }
};
