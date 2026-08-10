import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  Autocomplete,
  CircularProgress,
  Divider,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import packageService, { Package, PackageItem } from "@/services/packageService";
import productService, { Product } from "@/services/productService";
import { toast } from "sonner";

interface PackageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageToEdit: Package | null;
}

const PackageFormModal: React.FC<PackageFormModalProps> = ({
  isOpen,
  onClose,
  packageToEdit,
}) => {
  const { t } = useTranslation("packageFormModal");
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [items, setItems] = useState<PackageItem[]>([]);
  const [isCreated, setIsCreated] = useState(false);
  const [activePackage, setActivePackage] = useState<Package | null>(null);
  
  // Product Search State
  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (packageToEdit) {
      setName(packageToEdit.name);
      setItems(packageToEdit.items || []);
      setIsCreated(true);
      setActivePackage(packageToEdit);
    } else {
      setName("");
      setItems([]);
      setIsCreated(false);
      setActivePackage(null);
    }
  }, [packageToEdit, isOpen]);

  useEffect(() => {
    if (!productSearch.trim()) {
      setProductOptions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await productService.getProductsForAutocomplete(productSearch);
        setProductOptions(results);
      } catch (error) {
        console.error("Error searching products:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [productSearch]);

  const handleAddItem = (product: Product) => {
    const existing = items.find((item) => item.product_id === product.id);
    if (existing) {
      toast.info(t("productAlreadyInPackage"));
      return;
    }
    
    const newItems = [
      ...items,
      {
        product_id: product.id!,
        product,
      },
    ];
    
    setItems(newItems as PackageItem[]);
    setProductSearch("");
    
    // Auto-save changes if package is already created
    if (activePackage) {
      mutation.mutate({
        ...activePackage,
        items: newItems.map(item => ({ product_id: item.product_id }))
      });
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    
    // Auto-save changes
    if (activePackage) {
      mutation.mutate({
        ...activePackage,
        items: newItems.map(item => ({ product_id: item.product_id }))
      });
    }
  };

  const mutation = useMutation({
    mutationFn: (data: Partial<Package>) =>
      activePackage
        ? packageService.updatePackage(activePackage.id!, data as Package)
        : packageService.createPackage(data as Package),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      if (!activePackage) {
        toast.success(t("createSuccess"));
        setIsCreated(true);
        setActivePackage(data);
      }
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || t("genericError"));
    },
  });

  const handleCreatePackage = () => {
    if (!name.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    mutation.mutate({ name });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {activePackage ? t("editPackageTitle", { name }) : t("createPackageTitle")}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Step 1: Basic Info */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <TextField
              label={t("packageName")}
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isCreated && !!activePackage}
              size="small"
            />
            {!isCreated && (
              <Button 
                variant="contained" 
                onClick={handleCreatePackage}
                disabled={mutation.isPending}
                sx={{ whiteSpace: "nowrap" }}
              >
                {mutation.isPending ? t("creating") : t("create")}
              </Button>
            )}
            {isCreated && activePackage && (
              <Button
                size="small"
                onClick={() => {
                  setIsCreated(false);
                  setActivePackage(null);
                }}
                variant="outlined"
                color="inherit"
              >
                {t("change")}
              </Button>
            )}
          </Box>

          {isCreated && (
            <>
              <Divider />

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {t("productsInPackage")}
                </Typography>

                <Autocomplete
                  options={productOptions}
                  getOptionLabel={(option) => option.name}
                  loading={isSearching}
                  onInputChange={(_, value) => setProductSearch(value)}
                  onChange={(_, value) => value && handleAddItem(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("searchProductToAdd")}
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {isSearching ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />

                <List sx={{ maxHeight: 300, overflow: "auto" }}>
                  {items.map((item, index) => (
                    <ListItem key={index} divider sx={{ px: 0 }}>
                      <Box sx={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight="medium">
                            {item.product?.name || t("unnamedProduct", { id: item.product_id })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t("unitPrice", { price: item.product?.sale_price || 0 })}
                          </Typography>
                        </Box>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 size={18} />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                  {items.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                      {t("noProductsAdded")}
                    </Typography>
                  )}
                </List>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="inherit">
          {t("close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PackageFormModal;
