'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DynamicIcon } from '@/lib/icons';
import { formatLatam, parseLatam } from '@/lib/format';

interface CalculatorPopupProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

export default function CalculatorPopup({ value, onChange, onClose }: CalculatorPopupProps) {
  const [display, setDisplay] = useState(value ? parseLatam(value).toString() : '0');
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [newNumber, setNewNumber] = useState(true);

  const handleDigit = (d: string) => {
    if (newNumber) {
      setDisplay(d === ',' ? '0.' : d);
      setNewNumber(false);
    } else {
      // Only allow one decimal point
      if (d === ',' && display.includes('.')) return;
      setDisplay(prev => {
        const next = prev + (d === ',' ? '.' : d);
        // Limit decimal places
        const dotIdx = next.indexOf('.');
        if (dotIdx !== -1 && next.length - dotIdx > 3) return prev;
        return next;
      });
    }
  };

  const handleOp = (op: string) => {
    const current = parseFloat(display);
    if (prevValue !== null && pendingOp && !newNumber) {
      let result = prevValue;
      if (pendingOp === '+') result = prevValue + current;
      else if (pendingOp === '-') result = prevValue - current;
      else if (pendingOp === '*') result = prevValue * current;
      else if (pendingOp === '/') result = current !== 0 ? prevValue / current : 0;
      setDisplay(result.toString());
      setPrevValue(result);
    } else {
      setPrevValue(current);
    }
    setPendingOp(op);
    setNewNumber(true);
  };

  const handleEquals = () => {
    if (prevValue === null || !pendingOp) return;
    const current = parseFloat(display);
    let result = prevValue;
    if (pendingOp === '+') result = prevValue + current;
    else if (pendingOp === '-') result = prevValue - current;
    else if (pendingOp === '*') result = prevValue * current;
    else if (pendingOp === '/') result = current !== 0 ? prevValue / current : 0;
    setDisplay(result.toString());
    setPrevValue(null);
    setPendingOp(null);
    setNewNumber(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setPendingOp(null);
    setPrevValue(null);
    setNewNumber(true);
  };

  const handleBackspace = () => {
    if (display.length <= 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
    } else {
      setDisplay(prev => prev.slice(0, -1));
    }
  };

  const handlePercent = () => {
    const current = parseFloat(display);
    if (prevValue !== null) {
      setDisplay((prevValue * current / 100).toString());
    } else {
      setDisplay((current / 100).toString());
    }
    setNewNumber(true);
  };

  const handleNegate = () => {
    setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : `-${prev}`);
  };

  const handleApply = () => {
    const num = parseFloat(display);
    if (!isNaN(num)) {
      onChange(formatLatam(num));
    }
    onClose();
  };

  const displayNum = parseFloat(display);
  const displayFormatted = isNaN(displayNum) ? '0' : formatLatam(displayNum, 2);

  const btnClass = 'h-10 text-base font-medium rounded-lg active:scale-95 transition-all';

  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
      {/* Display */}
      <div className="bg-slate-900 text-white p-3">
        <div className="text-right text-2xl font-mono tracking-tight min-h-[36px] flex items-center justify-end">
          {displayFormatted}
        </div>
        {pendingOp && prevValue !== null && (
          <div className="text-right text-xs text-slate-400 mt-0.5">
            {formatLatam(prevValue, 2)} {pendingOp}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-4 gap-1 p-2">
        <Button variant="outline" className={`${btnClass} text-slate-600`} onClick={handleClear}>C</Button>
        <Button variant="outline" className={`${btnClass} text-slate-600`} onClick={handleBackspace}><DynamicIcon name="Delete" className="w-4 h-4 mx-auto" /></Button>
        <Button variant="outline" className={`${btnClass} text-slate-600`} onClick={handlePercent}>%</Button>
        <Button variant="outline" className={`${btnClass} text-amber-600 font-bold`} onClick={() => handleOp('/')}>÷</Button>

        <Button variant="outline" className={btnClass} onClick={() => handleDigit('7')}>7</Button>
        <Button variant="outline" className={btnClass} onClick={() => handleDigit('8')}>8</Button>
        <Button variant="outline" className={btnClass} onClick={() => handleDigit('9')}>9</Button>
        <Button variant="outline" className={`${btnClass} text-amber-600 font-bold`} onClick={() => handleOp('*')}>×</Button>

        <Button variant="outline" className={btnClass} onClick={() => handleDigit('4')}>4</Button>
        <Button variant="outline" className={btnClass} onClick={() => handleDigit('5')}>5</Button>
        <Button variant="outline" className={btnClass} onClick={() => handleDigit('6')}>6</Button>
        <Button variant="outline" className={`${btnClass} text-amber-600 font-bold`} onClick={() => handleOp('-')}>−</Button>

        <Button variant="outline" className={btnClass} onClick={() => handleDigit('1')}>1</Button>
        <Button variant="outline" className={btnClass} onClick={() => handleDigit('2')}>2</Button>
        <Button variant="outline" className={btnClass} onClick={() => handleDigit('3')}>3</Button>
        <Button variant="outline" className={`${btnClass} text-amber-600 font-bold`} onClick={() => handleOp('+')}>+</Button>

        <Button variant="outline" className={`${btnClass} col-span-2`} onClick={() => handleDigit('0')}>0</Button>
        <Button variant="outline" className={btnClass} onClick={() => handleDigit(',')}>,</Button>
        <Button className={`${btnClass} bg-emerald-600 hover:bg-emerald-700 text-white font-bold`} onClick={handleApply}>=</Button>
      </div>

      {/* Extra row */}
      <div className="grid grid-cols-2 gap-1 px-2 pb-2">
        <Button variant="ghost" size="sm" className="text-xs" onClick={handleNegate}>+/−</Button>
      </div>
    </div>
  );
}
