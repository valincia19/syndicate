/**
 * Anti-Debugging Module
 * Injects recurring debugger checks to prevent developers/crackers from inspecting the execution flow.
 */

const t = require('@babel/types');

module.exports = {
  name: 'antiDebugging',
  description: 'Injects dynamic debugger hooks and timing checks to block reverse engineering tools',

  run(ast, options = {}) {
    // Generate AST for the anti-debugger routine:
    // (function() {
    //   function debugCheck(level) {
    //     if (('' + level / level).length !== 1 || level % 20 === 0) {
    //       (function() {}.constructor('debugger')());
    //     } else {
    //       debugger;
    //     }
    //     debugCheck(++level);
    //   }
    //   try {
    //     debugCheck(0);
    //   } catch(e) {}
    // })();
    
    const debugRoutine = t.expressionStatement(
      t.callExpression(
        t.functionExpression(
          null,
          [],
          t.blockStatement([
            t.functionDeclaration(
              t.identifier('debugCheck'),
              [t.identifier('level')],
              t.blockStatement([
                t.ifStatement(
                  t.logicalExpression(
                    '||',
                    t.binaryExpression(
                      '!==',
                      t.memberExpression(
                        t.binaryExpression('+', t.stringLiteral(''), t.binaryExpression('/', t.identifier('level'), t.identifier('level'))),
                        t.identifier('length')
                      ),
                      t.numericLiteral(1)
                    ),
                    t.binaryExpression(
                      '===',
                      t.binaryExpression('%', t.identifier('level'), t.numericLiteral(20)),
                      t.numericLiteral(0)
                    )
                  ),
                  t.blockStatement([
                    t.expressionStatement(
                      t.callExpression(
                        t.callExpression(
                          t.memberExpression(
                            t.functionExpression(null, [], t.blockStatement([])),
                            t.identifier('constructor')
                          ),
                          [t.stringLiteral('debugger')]
                        ),
                        []
                      )
                    )
                  ]),
                  t.blockStatement([
                    t.debuggerStatement()
                  ])
                ),
                t.expressionStatement(
                  t.callExpression(
                    t.identifier('debugCheck'),
                    [t.updateExpression('++', t.identifier('level'))]
                  )
                )
              ])
            ),
            t.tryStatement(
              t.blockStatement([
                t.expressionStatement(
                  t.callExpression(
                    t.identifier('debugCheck'),
                    [t.numericLiteral(0)]
                  )
                )
              ]),
              t.catchClause(
                t.identifier('e'),
                t.blockStatement([])
              )
            )
          ])
        ),
        []
      )
    );

    // Prepend to program body
    ast.program.body.unshift(debugRoutine);
    return ast;
  }
};
