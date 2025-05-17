// src/components/admin/categories/CategoryFormModal.tsx
import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

// shadcn/ui & Lucide
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import categoryService, { Category } from "@/services/CategoryService";
// ... Alert component if needed for serverError

// Services and Types

// --- Zod Schema ---
const categoryFormSchema = z.object({
  name: z.string().min(1, { message: "validation:required" }),
  description: z.string().nullable().optional(),
  parent_id: z.preprocess(
    // Convert empty string to null for optional number
    (val) => (val === "" || val === "0" || val === 0 ? null : val),
    z.number().positive().nullable().optional()
  ),
});
type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// --- Component Props ---
interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit: Category | null;
  onSaveSuccess: (category: Category) => void;
  allCategories: Category[]; // For parent category dropdown (flat list)
  loadingCategories: boolean; // If parent categories are being loaded
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  onSaveSuccess,
  allCategories,
  loadingCategories,
}) => {
  const { t } = useTranslation(["categories", "common", "validation"]);
  const isEditMode = Boolean(categoryToEdit);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", description: "", parent_id: null },
  });
  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting, errors },
    setError,
  } = form;

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      if (isEditMode && categoryToEdit) {
        reset({
          name: categoryToEdit.name || "",
          description: categoryToEdit.description || "",
          parent_id: categoryToEdit.parent_id || null,
        });
      } else {
        reset();
      }
    }
  }, [isOpen, isEditMode, categoryToEdit, reset]);

  const onSubmit: SubmitHandler<CategoryFormValues> = async (data) => {
    setServerError(null);
    const apiData = { ...data, parent_id: data.parent_id || null }; // Ensure null if empty
    try {
      let savedCategory: Category;
      if (isEditMode && categoryToEdit) {
        savedCategory = await categoryService.updateCategory(
          categoryToEdit.id,
          apiData
        );
      } else {
        savedCategory = await categoryService.createCategory(apiData);
      }
      toast.success(t("common:success"), {
        description: t(
          isEditMode ? "categories:updateSuccess" : "categories:createSuccess"
        ),
      });
      onSaveSuccess(savedCategory);
      onClose();
    } catch (err) {
      if (err.response?.data?.errors) {
        const apiErrors = err.response.data.errors;
        Object.keys(apiErrors).forEach((field) => {
          setError(field as keyof CategoryFormValues, {
            type: "server",
            message: t(apiErrors[field][0]),
          });
        });
      } else if (err.response?.data?.message) {
        setServerError(t(err.response.data.message));
      } else {
        setServerError(t("common:unknownError"));
      }
      toast.error(t("common:error"), {
        description: t("categories:saveError"),
      });
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0">
        <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <DialogHeader className="p-6 pb-4 border-b dark:border-zinc-700">
              <DialogTitle className="dark:text-white">
              {isEditMode
                ? t("categories:editCategory")
                : t("categories:addCategory")}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {serverError && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-400 dark:bg-red-950 dark:text-red-200">
                <AlertCircle className="me-2 h-5 w-5" />
                <span>{serverError}</span>
              </div>
              )}
              <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                <FormLabel className="dark:text-white">
                  {t("categories:nameLabel")}
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                  {...field}
                  disabled={isSubmitting}
                  className="dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
                  />
                </FormControl>
                <FormMessage className="dark:text-red-300" />
                </FormItem>
              )}
              />
              <FormField
              control={control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                <FormLabel className="dark:text-white">
                  {t("categories:parentCategoryLabel")}
                </FormLabel>
                <Select
                  onValueChange={(value) =>
                  field.onChange(value ? Number(value) : null)
                  }
                  value={field.value ? String(field.value) : ""}
                  disabled={isSubmitting || loadingCategories}
                >
                  <FormControl>
                  <SelectTrigger className="dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700">
                    <SelectValue
                    placeholder={t(
                      "categories:selectParentPlaceholder"
                    )}
                    className="dark:text-zinc-400"
                    />
                  </SelectTrigger>
                  </FormControl>
                  <SelectContent className="dark:bg-zinc-900 dark:text-zinc-100">
                  <SelectItem value=" " className="dark:text-zinc-100">
                    {t("categories:noParent")}
                  </SelectItem>
                  {allCategories
                    .filter(
                    (cat) =>
                      !categoryToEdit || cat.id !== categoryToEdit.id
                    )
                    .map((cat) => (
                    <SelectItem
                      key={cat.id}
                      value={String(cat.id)}
                      className="dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      {cat.name}
                    </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="dark:text-red-300" />
                </FormItem>
              )}
              />
              <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                <FormLabel className="dark:text-white">
                  {t("categories:descriptionLabel")}
                </FormLabel>
                <FormControl>
                  <Textarea
                  className="resize-y min-h-[80px] dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
                  {...field}
                  value={field.value ?? ""}
                  disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage className="dark:text-red-300" />
                </FormItem>
              )}
              />
            </div>
            <DialogFooter className="p-6 pt-4 border-t dark:border-zinc-700">
              <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isSubmitting} className="dark:text-zinc-200">
                {t("common:cancel")}
              </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="dark:text-white">
              {isSubmitting && (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              )}
              {isEditMode ? t("common:update") : t("common:create")}
              </Button>
            </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default CategoryFormModal;
