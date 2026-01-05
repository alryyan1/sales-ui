import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface PosFilterContextType {
  filterDate: string | null;
  filterSaleId: string;
  setFilterDate: (date: string | null) => void;
  setFilterSaleId: (id: string) => void;
  onFetchSaleById: (id: number) => Promise<void>;
  onFetchSalesByDate: (date: string) => Promise<void>;
  isLoadingId: boolean;
  isLoadingDate: boolean;
  registerFetchFunctions: (
    fetchById: (id: number) => Promise<void>,
    fetchByDate: (date: string) => Promise<void>,
    loadingId: boolean,
    loadingDate: boolean
  ) => void;
}

const PosFilterContext = createContext<PosFilterContextType | undefined>(
  undefined
);

export const PosFilterProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [filterSaleId, setFilterSaleId] = useState<string>("");
  const [fetchByIdRef, setFetchByIdRef] = useState<((id: number) => Promise<void>) | null>(null);
  const [fetchByDateRef, setFetchByDateRef] = useState<((date: string) => Promise<void>) | null>(null);
  const [isLoadingId, setIsLoadingId] = useState(false);
  const [isLoadingDate, setIsLoadingDate] = useState(false);

  const registerFetchFunctions = useCallback((
    fetchById: (id: number) => Promise<void>,
    fetchByDate: (date: string) => Promise<void>,
    loadingId: boolean,
    loadingDate: boolean
  ) => {
    setFetchByIdRef(() => fetchById);
    setFetchByDateRef(() => fetchByDate);
    setIsLoadingId(loadingId);
    setIsLoadingDate(loadingDate);
  }, []);

  const handleFetchSaleById = useCallback(async (id: number) => {
    if (fetchByIdRef) {
      setIsLoadingId(true);
      try {
        await fetchByIdRef(id);
      } finally {
        setIsLoadingId(false);
      }
    }
  }, [fetchByIdRef]);

  const handleFetchSalesByDate = useCallback(async (date: string) => {
    if (fetchByDateRef) {
      setIsLoadingDate(true);
      try {
        await fetchByDateRef(date);
      } finally {
        setIsLoadingDate(false);
      }
    }
  }, [fetchByDateRef]);

  return (
    <PosFilterContext.Provider
      value={{
        filterDate,
        filterSaleId,
        setFilterDate,
        setFilterSaleId,
        onFetchSaleById: handleFetchSaleById,
        onFetchSalesByDate: handleFetchSalesByDate,
        isLoadingId,
        isLoadingDate,
        registerFetchFunctions,
      }}
    >
      {children}
    </PosFilterContext.Provider>
  );
};

export const usePosFilters = () => {
  const context = useContext(PosFilterContext);
  if (context === undefined) {
    throw new Error("usePosFilters must be used within a PosFilterProvider");
  }
  return context;
};

