class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateExpression(text: string): void {
    let i = 0;
    const len = text.length;
    let parenDepth = 0;
    let hasPlainExpressions = false;
    let hasKeyedExpressions = false;
    let lastTokenWasOperator = false;
    let lastTokenWasBlock = false;

    const skipWhitespace = () => {
      while (i < len && /\s/.test(text[i])) i++;
    };

    const parseExpressionValue = (): void => {
      if (i >= len) throw new ValidationError('Ожидается значение после оператора');
      
      const quoteChars = ['"', "'", "“", "”"];
      if (quoteChars.includes(text[i])) {
        const quoteChar = text[i];
        i++;
        let escaped = false;
        
        while (i < len) {

          if (escaped) {
            escaped = false;
          } else if (text[i] === '\\') {
            escaped = true;
          } else if (text[i] === quoteChar || 
                    (quoteChar === "“" && text[i] === "”") || 
                    (quoteChar === "”" && text[i] === "“")) {
            i++;
            return;
          }
          i++;
        }
        throw new ValidationError('Незакрытая кавычка');
      }
      
      const specialCharacters = [')', '=', '(', '\\'];
      while (i < len && !/\s/.test(text[i]) && !specialCharacters.includes(text[i])) {
        i++;
      }
    };

    const parseKeyValue = (): void => {
      const lettersOnlyReg = /[A-Za-z]/;
      const keyStart = i;
      while (i < len && lettersOnlyReg.test(text[i])) i++;
      if (i === keyStart) throw new ValidationError('Ожидается ключ перед оператором =');
      
      skipWhitespace();
      if (text[i] !== '=') throw new ValidationError('Ожидается оператор = после ключа');
      i++;
      skipWhitespace();
      
      parseExpressionValue();
    };

    const parseBlock = (): void => {
      skipWhitespace();
      if (i >= len) throw new ValidationError('Неожиданный конец выражения');

      if (text.slice(i, i + 3).toUpperCase() === 'NOT') {
        i += 3;
        skipWhitespace();
        lastTokenWasOperator = false;
      }

      if (text[i] === '(') {
        i++;
        parenDepth++;
        skipWhitespace();
        parseExpression();
        skipWhitespace();
        if (text[i] !== ')') {
          throw new ValidationError('Отсутствует закрывающая скобка');
        } 
        i++;
        parenDepth--;
        lastTokenWasOperator = false;
        lastTokenWasBlock = true;
        return;
      }

      const keyValueSyntaxRegex = /^[A-Za-z]{2,}\s*=/;
      if (keyValueSyntaxRegex.test(text.slice(i))) {
        if (hasPlainExpressions) throw new ValidationError('Смешение типов логических выражений');
        hasKeyedExpressions = true;
        lastTokenWasOperator = false;
        parseKeyValue();
        lastTokenWasBlock = true;
      } else {
        if (hasKeyedExpressions) throw new ValidationError('Смешение типов логических выражений');
        hasPlainExpressions = true;
        lastTokenWasOperator = false;
        parseExpressionValue();
        lastTokenWasBlock = true;
      }
    };

    const parseExpression = (): void => {
      
      while (i < len) {
        
        parseBlock();
        
        skipWhitespace();
        if (i >= len) break;
        
        if (lastTokenWasBlock) {
          const nextPart = text.slice(i).trim().split(/\s+|(?=[()])/)[0].toUpperCase();
          const expressionTokens = [')', '(', 'AND', 'OR'];
          const operandStartChars = /[A-Za-z"']/;
          if (!expressionTokens.includes(nextPart) && operandStartChars.test(text[i])) {
            throw new ValidationError('Отсутствует логическая связка');
          }
        }

        const upper = text.slice(i).toUpperCase();
        if (upper.startsWith('AND') || upper.startsWith('OR')) {
          if (lastTokenWasOperator) throw new ValidationError('Повторяющаяся логическая связка');
          
          const opLength = upper.startsWith('AND') ? 3 : 2;
          i += opLength;
          skipWhitespace();
          lastTokenWasOperator = true;
          lastTokenWasBlock = false;
          
          if (i >= len) throw new ValidationError('Выражение после связки отсутствует');
        } else if (text[i] === ')') {
          break;
        } else if (parenDepth === 0) {
          break;
        }
      }
      
      if (lastTokenWasOperator) throw new ValidationError('Выражение после связки отсутствует');
    };

    try {
      skipWhitespace();
      parseExpression();
      skipWhitespace();
      
      if (i !== len) throw new ValidationError('Неожиданные символы в конце');
      if (parenDepth !== 0) throw new ValidationError('Неверное количество скобок');
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError('Некорректное выражение');
    }
  };

  export default validateExpression;