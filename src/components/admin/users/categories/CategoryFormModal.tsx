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
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>
                {isEditMode
                  ? t("categories:editCategory")
                  : t("categories:addCategory")}
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="alert alert-error">
                <AlertCircle className="me-2 h-5 w-5" />
                <span>{serverError}</span>
              </div>
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    {" "}
                    <FormLabel>
                      {t("categories:nameLabel")}{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>{" "}
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>{" "}
                    <FormMessage />{" "}
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="parent_id"
                render={({ field }) => (
                  <FormItem>
                    {" "}
                    <FormLabel>
                      {t("categories:parentCategoryLabel")}
                    </FormLabel>{" "}
                    {/* Add key */}
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value ? Number(value) : null)
                      }
                      value={field.value ? String(field.value) : ""}
                      disabled={isSubmitting || loadingCategories}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              "categories:selectParentPlaceholder"
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>{" "}
                      {/* Add key */}
                      <SelectContent>
                        <SelectItem value=" ">
                          {t("categories:noParent")}
                        </SelectItem>{" "}
                        {/* Add key */}
                        {allCategories
                          .filter(
                            (cat) =>
                              !categoryToEdit || cat.id !== categoryToEdit.id
                          ) // Prevent self-parenting
                          .map((cat) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              {cat.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>{" "}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    {" "}
                    <FormLabel>
                      {t("categories:descriptionLabel")}
                    </FormLabel>{" "}
                    <FormControl>
                      <Textarea
                        className="resize-y min-h-[80px]"
                        {...field}
                        value={field.value ?? ""}
                        disabled={isSubmitting}
                      />
                    </FormControl>{" "}
                    <FormMessage />{" "}
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="p-6 pt-4 border-t">
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isSubmitting}>
                  {t("common:cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {" "}
                {isSubmitting && (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                )}{" "}
                {isEditMode ? t("common:update") : t("common:create")}{" "}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default CategoryFormModal;
