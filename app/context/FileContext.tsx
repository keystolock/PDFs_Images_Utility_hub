'use client';
import React, { createContext, useContext, useState } from 'react';

interface FileContextType {
  files: File[];
  activeFile: File | null;
  setFiles: (files: File[]) => void;
  addFiles: (newFiles: File[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  setActiveFile: (file: File | null) => void;
  setActiveIndex: (index: number) => void;
  activeIndex: number;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: React.ReactNode }) {
  const [files, setFilesState] = useState<File[]>([]);
  const [activeIndex, setActiveIndexState] = useState<number>(0);

  const setFiles = (newFiles: File[]) => {
    setFilesState(newFiles);
    setActiveIndexState(0);
  };

  const addFiles = (newFiles: File[]) => {
    setFilesState((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFilesState((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (activeIndex >= updated.length) {
        setActiveIndexState(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const clearFiles = () => {
    setFilesState([]);
    setActiveIndexState(0);
  };

  const setActiveFile = (file: File | null) => {
    if (!file) {
      setActiveIndexState(0);
      return;
    }
    const idx = files.findIndex((f) => f === file);
    if (idx !== -1) {
      setActiveIndexState(idx);
    }
  };

  const setActiveIndex = (index: number) => {
    if (index >= 0 && index < files.length) {
      setActiveIndexState(index);
    }
  };

  const activeFile = files.length > 0 && activeIndex < files.length ? files[activeIndex] : null;

  return (
    <FileContext.Provider
      value={{
        files,
        activeFile,
        setFiles,
        addFiles,
        removeFile,
        clearFiles,
        setActiveFile,
        setActiveIndex,
        activeIndex,
      }}
    >
      {children}
    </FileContext.Provider>
  );
}

export function useFileContext() {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFileContext must be used within a FileProvider');
  }
  return context;
}
