import React, { useState, useMemo, useEffect } from 'react';
import { Input } from 'antd';
import './HighlightedTextarea.css';
import validateExpression from '../utility/validateExpression';

const { TextArea } = Input;

interface HighlightedTextareaProps {
  value?: string;
}

const HighlightedTextarea: React.FC<HighlightedTextareaProps> = ({ value = '' }) => {
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

  const processQuotedValue = (
    inputValue: string,
    i: number,
    tokens: React.ReactNode[],
    len: number
  ): number => {
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
      } else if (
        inputValue[j] === quoteChar ||
        (quoteChar === "“" && inputValue[j] === "”") ||
        (quoteChar === "”" && inputValue[j] === "“")
      ) {
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

    return i;
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

        const logicalOperators = ['AND', 'OR', 'NOT'];
        let operatorMatched = false;
        for (const operator of logicalOperators) {
          const opLength = operator.length;
          if (inputValue.slice(i, i + opLength).toUpperCase() === operator) {
            tokens.push(<span key={i} className="logical-operator">{operator}</span>);
            i += opLength;
            operatorMatched = true;
            break;
          }
        }
        if (operatorMatched) continue;

        if (inputValue[i] === '(' || inputValue[i] === ')') {
          tokens.push(<span key={i}>{inputValue[i]}</span>);
          i++;
          continue;
        }

        const quoteChars = ['"', "'", "“", "”"];
        const keyValueSyntaxRegex = /^[A-Za-z]{2,}\s*=/;
        if (keyValueSyntaxRegex.test(inputValue.slice(i))) {
          const keyEnd = inputValue.indexOf('=', i);
          const key = inputValue.slice(i, keyEnd).trim();
          
          tokens.push(<span key={i} className="key">{key}</span>);
          tokens.push(<span key={`${i}-eq`}>=</span>);
          i = keyEnd + 1;          
          
          if (quoteChars.includes(inputValue[i])) {
            i = processQuotedValue(inputValue, i, tokens, len);
            continue;
          }

          const specialCharacters = [')', '=', '(', '\\'];
          while (i < len && !/\s/.test(inputValue[i]) && 
                !specialCharacters.includes(inputValue[i])) {
            tokens.push(<span key={i}>{inputValue[i]}</span>);
            i++;
          }
          continue;
        }

        if (quoteChars.includes(inputValue[i])) {
          i = processQuotedValue(inputValue, i, tokens, len);
          continue;
        }

        tokens.push(<span key={i}>{inputValue[i]}</span>);
        i++;
      }

      return tokens;
    } catch (error) {            
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
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
        className={`textarea ${errorMessage ? 'error' : ''}`}
        placeholder="Пример: (TI=”Kaspersky” OR AB=”Avast”) AND NOT (DP=”2021-21-17”)"
      />
      <div className={`highlight-overlay ${errorMessage ? 'hidden' : ''}`}>
        {highlightedText}
      </div>
      {errorMessage && (
        <div className="error-message">{errorMessage}</div>
      )}
    </div>
  );
};

export default HighlightedTextarea;