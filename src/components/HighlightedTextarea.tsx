import React, { useState, useMemo, useEffect } from 'react';
import { Input } from 'antd';
import './HighlightedTextarea.css';

const { TextArea } = Input;

interface HighlightedTextareaProps {
  value?: string;
  onChange?: (value: string) => void;
}

const HighlightedTextarea: React.FC<HighlightedTextareaProps> = ({ value = '', onChange }) => {
  const [inputValue, setInputValue] = useState(value);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setInputValue(value);
    setIsValid(true);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    onChange?.(e.target.value);
    setIsValid(true);
  };

  const validateExpression = (text: string): boolean => {
    try {
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
  
      const parseValue = (): boolean => {
        if (i >= len) return false;
        
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
              return true;
            }
            i++;
          }
          return false;
        }
        
        while (i < len && !/\s/.test(text[i]) && ![')', '=', '(', '\\'].includes(text[i])) {
          i++;
        }
        return true;
      };
  
      const parseKeyValue = (): boolean => {
        const keyStart = i;
        while (i < len && /[A-Za-z]/.test(text[i])) i++;
        if (i === keyStart) return false;
        
        skipWhitespace();
        if (text[i] !== '=') return false;
        i++;
        skipWhitespace();
        
        return parseValue();
      };
  
      const parseBlock = (): boolean => {
        skipWhitespace();
        if (i >= len) return false;
  
        if (text.slice(i, i + 3).toUpperCase() === 'NOT') {
          i += 3;
          skipWhitespace();
          lastTokenWasOperator = false;
        }
  
        if (text[i] === '(') {
          i++;
          parenDepth++;
          skipWhitespace();
          if (!parseExpression()) return false;
          skipWhitespace();
          if (text[i] !== ')') return false;
          i++;
          parenDepth--;
          lastTokenWasOperator = false;
          lastTokenWasBlock = true;
          return true;
        }
  
        if (/^[A-Za-z]{2,}\s*=/.test(text.slice(i))) {
          if (hasType1) return false;
          hasType2 = true;
          lastTokenWasOperator = false;
          const result = parseKeyValue();
          lastTokenWasBlock = result;
          return result;
        } else {
          if (hasType2) return false;
          hasType1 = true;
          lastTokenWasOperator = false;
          const result = parseValue();
          lastTokenWasBlock = result;
          return result;
        }
      };
  
      const parseExpression = (): boolean => {
        let hasBlock = false;
        
        while (i < len) {
          if (!parseBlock()) return false;
          hasBlock = true;
          
          skipWhitespace();
          if (i >= len) break;
          
          if (lastTokenWasBlock) {
            const nextPart = text.slice(i).trim().split(/\s+|(?=[()])/)[0].toUpperCase();

            if (![')', '(', 'AND', 'OR'].includes(nextPart)) {
                const nextChar = text[i];
                if (/[A-Za-z"']/.test(nextChar)) {
                    return false; 
                }
            }
          }
  
          const upper = text.slice(i).toUpperCase();
          if (upper.startsWith('AND') || upper.startsWith('OR')) {
            if (lastTokenWasOperator) return false; 
            
            const opLength = upper.startsWith('AND') ? 3 : 2;
            i += opLength;
            skipWhitespace();
            lastTokenWasOperator = true;
            lastTokenWasBlock = false;
            
            if (i >= len) return false;
          } else if (text[i] === ')') {
            break;
          } else if (parenDepth === 0) {
            break;
          }
        }
        
        if (lastTokenWasOperator) return false;
        
        return hasBlock;
      };
  
      skipWhitespace();
      if (!parseExpression()) return false;
      skipWhitespace();
      return i === len && parenDepth === 0;
    } catch {
      return false;
    }
  };

  const highlightedText = useMemo(() => {
    try {
      const isValidExpression = validateExpression(inputValue);
      setIsValid(isValidExpression);

      if (!isValidExpression) {
        return [<span key="0">{inputValue}</span>];
      }

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
    } catch {
      setIsValid(false);
      return [<span key="0">{inputValue}</span>];
    }
  }, [inputValue]);

  return (
    <div className="highlighted-textarea-container">
      <TextArea
        value={inputValue}
        onChange={handleChange}
        autoSize={{ minRows: 3 }}
        className={`textarea ${!isValid ? 'error' : ''}`}
        placeholder="Пример: (TI=”Kaspersky” OR AB=”Avast”) AND NOT (DP=”2021-21-17”)"
      />
      <div className={`highlight-overlay ${!isValid ? 'hidden' : ''}`}>
        {highlightedText}
      </div>
      {!isValid && (
        <div className="error-message">Некорректное логическое выражение</div>
      )}
    </div>
  );
};

export default HighlightedTextarea;