import { useState, ChangeEvent, useEffect, useRef } from "react";

import style from "./Input.module.css";

export function InputRange({
  min,
  showMin = true,
  max,
  showMax = true,
  step,
  value,
  showValueWhenChange = false,
  onChange,
  className,
  ...prop
}: {
  min?: number;
  showMin?: boolean;
  max?: number;
  showMax?: boolean;
  step?: number;
  value?: number;
  showValueWhenChange?: boolean;
  className?: string;
  onChange?: (value: number) => void;
} & Omit<React.HTMLAttributes<HTMLInputElement>, "className" | "onChange">) {
  return (
    <div className={`${style["input-range-root"]} ${className || ""}`}>
      {showMin && <span className={style["input-range-number"]}>{min}</span>}
      <input
        {...prop}
        value={value}
        onChange={(e) => onChange?.(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        type="range"
        className={style["input-range"]}
      ></input>
      {showMax && <span className={style["input-range-number"]}>{max}</span>}
    </div>
  );
}

export function InputText({
  value: initialValue,
  className,
  onChange,
  verification,
  ref,
  ...prop
}: {
  value?: string;
  className?: string;
  ref?: React.LegacyRef<HTMLInputElement> | undefined;
  onChange?: (value: string) => void;
  verification?: (value: string) => boolean;
} & Omit<React.HTMLAttributes<HTMLInputElement>, "className" | "onChange">) {
  const [inputValue, setInputValue] = useState<string>(initialValue || "");
  const [isError, setIsError] = useState<boolean>(false);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);

    if (verification) {
      const isValid = verification(newValue);
      setIsError(!isValid);
      if (isValid && onChange) {
        onChange(newValue);
      }
    } else {
      setIsError(false);
      if (onChange) {
        onChange(newValue);
      }
    }
  };

  useEffect(() => {
    setInputValue(initialValue || "");
  }, [initialValue]);

  return (
    <input
      {...prop}
      ref={ref}
      type="text"
      className={
        isError ? `${className || ""} ${style["input-text-error"]}` : className
      }
      value={inputValue}
      onChange={handleInputChange}
    />
  );
}

interface InputListProps<T extends string> {
  value: T[];
  onChange?: (value: T[]) => void;
  max?: number;
  verification?: (value: T) => boolean;
  className?: string;
  classNameItem?: string;
  classNameItemEdit?: string;
}

export function InputList<T extends string>({
  value,
  onChange,
  max = Infinity,
  verification,
  className,
  classNameItem,
  classNameItemEdit,
}: InputListProps<T>) {
  const [inputValue, setInputValue] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handelRootClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (e.target === containerRef.current) {
      inputRef.current?.focus();
    }
  };

  // 处理输入框键盘事件
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmedValue = inputValue.trim() as T;
      if (
        trimmedValue &&
        value.length < max &&
        (!verification || verification(trimmedValue))
      ) {
        onChange?.([...value, trimmedValue]);
        setInputValue("");
      }
    } else if (e.key === "Backspace" && !inputValue) {
      if (value.length > 0) {
        onChange?.(value.slice(0, -1));
      }
    }
  };

  // 拖拽排序处理
  const handleDragStart =
    (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData("index", index.toString());
    };

  const handleDrop =
    (targetIndex: number) => (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const sourceIndex = parseInt(e.dataTransfer.getData("index"));
      if (sourceIndex !== targetIndex) {
        const newItems = [...value];
        const [removed] = newItems.splice(sourceIndex, 1);
        newItems.splice(targetIndex, 0, removed);
        onChange?.(newItems);
      }
    };

  // 项目编辑处理
  const handleEditConfirm = () => {
    if (editingIndex !== null) {
      if (editingValue.trim()) {
        if (!verification || verification(editingValue.trim() as T)) {
          const newItems = [...value];
          newItems[editingIndex] = editingValue.trim() as T;
          onChange?.(newItems);
        }
      } else {
        onChange?.(value.filter((_, i) => i !== editingIndex));
      }
    }
    setEditingIndex(null);
  };

  return (
    <div
      className={`${style["input-list-items"]} ${className || ""}`}
      ref={containerRef}
      onClick={handelRootClick}
    >
      {value.map((item, index) => (
        <div
          key={`${value.length}-${index}`}
          className={`${style["input-list-item"]} ${classNameItem || ""}`}
          draggable={editingIndex !== index}
          onDragStart={handleDragStart(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop(index)}
          onClick={() => {
            setEditingIndex(index);
            setEditingValue(item);
          }}
        >
          {editingIndex === index ? (
            <>
              <label className={style["input-list-edit-label"]}>
                {editingValue}
              </label>
              <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleEditConfirm();
                  } else if (e.key === "Backspace" && !editingValue) {
                    onChange?.(value.filter((_, i) => i !== editingIndex));
                    setEditingIndex(null);
                  }
                }}
                onBlur={handleEditConfirm}
                autoFocus
                className={`${style["input-list-edit"]} ${classNameItemEdit || ""}`}
              />
            </>
          ) : (
            <>
              <span>{item}</span>
              <button
                className={style["input-list-delete"]}
                onClick={() => onChange?.(value.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </>
          )}
        </div>
      ))}
      <div className={style["input-list-control"]}>
        <InputText
          value={inputValue}
          onChange={setInputValue}
          verification={(val) => !verification || verification(val as T)}
          onKeyDown={handleInputKeyDown}
          className={`${style["input-list-input"]}`}
          ref={inputRef}
        />
        {max < Infinity && (
          <div className={style["input-list-counter"]}>
            {value.length}/{max}
          </div>
        )}
      </div>
    </div>
  );
}
