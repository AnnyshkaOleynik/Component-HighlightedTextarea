import React, { useState, useMemo, useEffect } from 'react';
import { Input } from 'antd';
import './HighlightedTextarea.css';

const { TextArea } = Input;

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const HighlightedTextarea = ({ value = '' }) => {
  const [inputValue, setInputValue] = useState(value);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setInputValue(value);
    setErrorMessage('');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    setErrorMessage('');
  };

  const validateExpression = (text: string): void => {
    let i = 0;
    const len = text.length;
    let parenDepth = 0;
    let hasType1 = false;
    let hasType2 = false;
    let lastTokenWasOperator = false;
    let lastTokenWasBlock = false;

    const skipWhitespace = () => {
      while (i < len && /\s/.test(text[i])) i++;
    };

    const parseValue = (): void => {
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
      
      while (i < len && !/\s/.test(text[i]) && ![')', '=', '(', '\\'].includes(text[i])) {
        i++;
      }
    };

    const parseKeyValue = (): void => {
      const keyStart = i;
      while (i < len && /[A-Za-z]/.test(text[i])) i++;
      if (i === keyStart) throw new ValidationError('Ожидается ключ перед оператором =');
      
      skipWhitespace();
      if (text[i] !== '=') throw new ValidationError('Ожидается оператор = после ключа');
      i++;
      skipWhitespace();
      
      parseValue();
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
        if (text[i] !== ')') throw new ValidationError('Отсутствует закрывающая скобка');
        i++;
        parenDepth--;
        lastTokenWasOperator = false;
        lastTokenWasBlock = true;
        return;
      }

      if (/^[A-Za-z]{2,}\s*=/.test(text.slice(i))) {
        if (hasType1) throw new ValidationError('Смешение типов логических выражений');
        hasType2 = true;
        lastTokenWasOperator = false;
        parseKeyValue();
        lastTokenWasBlock = true;
      } else {
        if (hasType2) throw new ValidationError('Смешение типов логических выражений');
        hasType1 = true;
        lastTokenWasOperator = false;
        parseValue();
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
          if (![')', '(', 'AND', 'OR'].includes(nextPart) && /[A-Za-z"']/.test(text[i])) {
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

  const highlightedText = useMemo(() => {
    try {
      validateExpression(inputValue);
      setErrorMessage('');
      
      const tokens = [];
      let i = 0;
      const len = inputValue.length;

      while (i < len) {
      if (/\s/.test(inputValue[i])) {
        tokens.push(<span key={i}>{inputValue[i]}</span>);
        i++;
        continue;
      }

      if (inputValue.slice(i, i + 3).toUpperCase() === 'AND') {
        tokens.push(<span key={i} className="logical-operator">AND</span>);
        i += 3;
        continue;
      }
      if (inputValue.slice(i, i + 2).toUpperCase() === 'OR') {
        tokens.push(<span key={i} className="logical-operator">OR</span>);
        i += 2;
        continue;
      }
      if (inputValue.slice(i, i + 3).toUpperCase() === 'NOT') {
        tokens.push(<span key={i} className="logical-operator">NOT</span>);
        i += 3;
        continue;
      }

      if (inputValue[i] === '(' || inputValue[i] === ')') {
        tokens.push(<span key={i}>{inputValue[i]}</span>);
        i++;
        continue;
      }

      if (/^[A-Za-z]{2,}\s*=/.test(inputValue.slice(i))) {
        const keyEnd = inputValue.indexOf('=', i);
        const key = inputValue.slice(i, keyEnd);
        
        tokens.push(<span key={i} className="key">{key}</span>);
        tokens.push(<span key={`${i}-eq`}>=</span>);
        i = keyEnd + 1;

        const quoteChars = ['"', "'", "“", "”"];
        if (quoteChars.includes(inputValue[i])) {
          const quoteChar = inputValue[i];
          let valueStart = i;
          let valueEnd = -1;
          let j = i + 1;
          let escaped = false;
          
          while (j < len) {
            if (escaped) {
              escaped = false;
            } else if (inputValue[j] === '\\') {
              escaped = true;
            } else if (inputValue[j] === quoteChar || 
                      (quoteChar === "“" && inputValue[j] === "”") || 
                      (quoteChar === "”" && inputValue[j] === "“")) {
              valueEnd = j;
              break;
            }
            j++;
          }
          
          if (valueEnd > 0) {
            const valueContent = inputValue.slice(valueStart, valueEnd + 1);
            tokens.push(<span key={valueStart} className="quoted-value">{valueContent}</span>);
            i = valueEnd + 1;
          } else {
            tokens.push(<span key={i}>{inputValue[i]}</span>);
            i++;
          }
        } else {
          while (i < len && !/\s/.test(inputValue[i]) && 
                ![')', '=', '(', '\\'].includes(inputValue[i])) {
            tokens.push(<span key={i}>{inputValue[i]}</span>);
            i++;
          }
        }
        continue;
      }

      const quoteChars = ['"', "'", "“", "”"];
      if (quoteChars.includes(inputValue[i])) {
        const quoteChar = inputValue[i];
        let valueStart = i;
        let valueEnd = -1;
        let j = i + 1;
        let escaped = false;
        
        while (j < len) {
          if (escaped) {
            escaped = false;
          } else if (inputValue[j] === '\\') {
            escaped = true;
          } else if (inputValue[j] === quoteChar || 
                    (quoteChar === "“" && inputValue[j] === "”") || 
                    (quoteChar === "”" && inputValue[j] === "“")) {
            valueEnd = j;
            break;
          }
          j++;
        }
        
        if (valueEnd > 0) {
          const valueContent = inputValue.slice(valueStart, valueEnd + 1);
          tokens.push(<span key={valueStart} className="quoted-value">{valueContent}</span>);
          i = valueEnd + 1;
        } else {
          tokens.push(<span key={i}>{inputValue[i]}</span>);
          i++;
        }
        continue;
      }

      tokens.push(<span key={i}>{inputValue[i]}</span>);
      i++;
    }

      return tokens;
    } catch (error) {            
      let message = 'Неизвестная ошибка';
      if (typeof error === 'object' && error !== null && 'message' in error) {
        message = (error as Error).message;
      }
      
      setErrorMessage(message);
      return [<span key="0">{inputValue}</span>];
    }
  }, [inputValue]);

  return (
    <div className="highlighted-textarea-container">
      <TextArea
        value={inputValue}
        onChange={handleChange}
        autoSize={{ minRows: 3 }}
        className={`textarea ${errorMessage !== '' ? 'error' : ''}`}
        placeholder="Пример: (TI=”Kaspersky” OR AB=”Avast”) AND NOT (DP=”2021-21-17”)"
      />
      <div className={`highlight-overlay ${errorMessage !== '' ? 'hidden' : ''}`}>
        {highlightedText}
      </div>
      {errorMessage !== '' && (
        <div className="error-message">{errorMessage}</div>
      )}
    </div>
  );
};

export default HighlightedTextarea;