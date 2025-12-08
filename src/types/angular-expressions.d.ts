declare module 'angular-expressions' {
  interface CompiledExpression {
    (scope: Record<string, any>): any;
  }
  
  interface AngularExpressions {
    compile(expression: string): CompiledExpression;
  }
  
  const expressions: AngularExpressions;
  export default expressions;
}