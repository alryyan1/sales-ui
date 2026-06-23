import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2, Save, ArrowRight, Loader2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

import { ProductAutocomplete } from "@/components/common/ProductAutocomplete";
import { Product } from "@/services/productService";
import stockRequisitionService from "@/services/stockRequisitionService";

// ─── Predefined lists ──────────────────────────────────────────────────────

const DEFAULT_DEPARTMENTS = [
  "المستودع الرئيسي",
  "قسم الطوارئ",
  "قسم العمليات",
  "قسم التمريض",
  "قسم الصيدلة",
  "قسم الأشعة",
  "قسم المختبر",
  "قسم الهندسة والصيانة",
  "قسم التغذية والمطبخ",
  "الإدارة",
  "قسم تقنية المعلومات",
  "قسم الأمن والسلامة",
];

const COMMON_REASONS = [
  "احتياجات القسم الدورية",
  "تجديد المخزون",
  "طلب طارئ",
  "صيانة وإصلاح",
  "فعالية أو مناسبة",
  "بدل تالف أو مفقود",
  "تجهيز جديد",
  "أخرى",
];

// ─── Department Combobox ───────────────────────────────────────────────────

interface DepartmentComboboxProps {
  value: string;
  onChange: (val: string) => void;
}

const DepartmentCombobox: React.FC<DepartmentComboboxProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customDepts, setCustomDepts] = useState<string[]>([]);

  const allDepts = [...DEFAULT_DEPARTMENTS, ...customDepts];
  const filtered = allDepts.filter((d) =>
    d.includes(search)
  );
  const canCreate =
    search.trim().length > 0 &&
    !allDepts.some((d) => d === search.trim());

  const select = (dept: string) => {
    onChange(dept);
    setOpen(false);
    setSearch("");
  };

  const createNew = () => {
    const newDept = search.trim();
    if (newDept && !allDepts.includes(newDept)) {
      setCustomDepts((prev) => [...prev, newDept]);
    }
    select(newDept);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || "اختر الجهة المستهدفة..."}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 mr-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="ابحث أو اكتب جهة جديدة..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {canCreate ? (
                <button
                  className="w-full text-right px-4 py-2 text-sm text-primary hover:bg-muted cursor-pointer"
                  onClick={createNew}
                >
                  + إضافة "{search.trim()}"
                </button>
              ) : (
                <p className="text-sm text-muted-foreground py-2 text-center">
                  لا توجد نتائج
                </p>
              )}
            </CommandEmpty>
            <CommandGroup heading="الجهات الشائعة">
              {filtered.map((dept) => (
                <CommandItem
                  key={dept}
                  value={dept}
                  onSelect={() => select(dept)}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 ml-2",
                      value === dept ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {dept}
                </CommandItem>
              ))}
            </CommandGroup>
            {canCreate && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={createNew} className="text-primary">
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة "{search.trim()}" كجهة جديدة
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// ─── Reason Select ─────────────────────────────────────────────────────────

interface ReasonSelectProps {
  value: string;
  onChange: (val: string) => void;
  customValue: string;
  onCustomChange: (val: string) => void;
}

const ReasonSelect: React.FC<ReasonSelectProps> = ({
  value,
  onChange,
  customValue,
  onCustomChange,
}) => (
  <div className="space-y-2">
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="اختر سبب الصرف..." />
      </SelectTrigger>
      <SelectContent dir="rtl">
        {COMMON_REASONS.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {value === "أخرى" && (
      <Input
        placeholder="اكتب سبب الصرف..."
        value={customValue}
        onChange={(e) => onCustomChange(e.target.value)}
        autoFocus
      />
    )}
  </div>
);

// ─── Item Row ──────────────────────────────────────────────────────────────

interface ItemRow {
  product: Product | null;
  requested_quantity: number;
  item_notes: string;
}

// ─── Main Page ─────────────────────────────────────────────────────────────

const CreateStockRequisitionPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [department, setDepartment] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [requestDate, setRequestDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<ItemRow[]>([
    { product: null, requested_quantity: 1, item_notes: "" },
  ]);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { product: null, requested_quantity: 1, item_notes: "" },
    ]);

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof ItemRow, value: unknown) =>
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!department.trim()) {
      toast.error("يرجى اختيار الجهة المستهدفة");
      return;
    }
    if (!reason) {
      toast.error("يرجى اختيار سبب الصرف");
      return;
    }
    if (reason === "أخرى" && !customReason.trim()) {
      toast.error("يرجى كتابة سبب الصرف");
      return;
    }

    const validItems = items.filter((i) => i.product !== null);
    if (validItems.length === 0) {
      toast.error("يجب إضافة منتج واحد على الأقل");
      return;
    }

    const finalReason = reason === "أخرى" ? customReason.trim() : reason;
    const departmentOrReason = `${department.trim()} — ${finalReason}`;

    setIsSubmitting(true);
    try {
      await stockRequisitionService.createRequisition({
        department_or_reason: departmentOrReason,
        request_date: requestDate,
        notes: notes || null,
        items: validItems.map((item) => ({
          product_id: item.product!.id,
          requested_quantity: item.requested_quantity,
          item_notes: item.item_notes || null,
        })),
      });
      toast.success("تم إنشاء طلب الصرف بنجاح");
      navigate("/inventory/requisitions");
    } catch (err) {
      const msg = stockRequisitionService.getErrorMessage(err);
      toast.error("فشل إنشاء الطلب", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10"
      dir="rtl"
    >
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/inventory/requisitions")}
          type="button"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">إنشاء طلب صرف جديد</h1>
          <p className="text-sm text-muted-foreground">
            تعبئة بيانات الطلب والأصناف المطلوبة
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Header Card ── */}
        <Card className="dark:bg-gray-900">
          <CardHeader>
            <CardTitle>معلومات الطلب</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Department */}
            <div className="space-y-1.5">
              <Label>
                الجهة المستهدفة <span className="text-destructive">*</span>
              </Label>
              <DepartmentCombobox
                value={department}
                onChange={setDepartment}
              />
              <p className="text-xs text-muted-foreground">
                اختر من القائمة أو اكتب اسم الجهة وأضفها
              </p>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label>
                سبب الصرف <span className="text-destructive">*</span>
              </Label>
              <ReasonSelect
                value={reason}
                onChange={setReason}
                customValue={customReason}
                onCustomChange={setCustomReason}
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="request_date">
                تاريخ الطلب <span className="text-destructive">*</span>
              </Label>
              <Input
                id="request_date"
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="notes">ملاحظات إضافية</Label>
              <Textarea
                id="notes"
                placeholder="أي تفاصيل أو ملاحظات..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Items Card ── */}
        <Card className="dark:bg-gray-900">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>الأصناف المطلوبة</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
            >
              <Plus className="h-4 w-4 ml-1" />
              إضافة صنف
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right w-[45%]">المنتج</TableHead>
                  <TableHead className="text-center w-[18%]">
                    الكمية المطلوبة
                  </TableHead>
                  <TableHead className="text-right w-[32%]">
                    ملاحظات الصنف
                  </TableHead>
                  <TableHead className="w-[5%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="py-2">
                      <ProductAutocomplete
                        value={item.product}
                        onChange={(product) =>
                          updateItem(index, "product", product)
                        }
                        showSku={false}
                        size="small"
                        label=""
                        placeholder="ابحث عن منتج..."
                      />
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <Input
                        type="number"
                        min={1}
                        value={item.requested_quantity}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "requested_quantity",
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        className="w-24 text-center mx-auto"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        placeholder="ملاحظة..."
                        value={item.item_notes}
                        onChange={(e) =>
                          updateItem(index, "item_notes", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/inventory/requisitions")}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
            )}
            <Save className="h-4 w-4 ml-2" />
            حفظ الطلب
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateStockRequisitionPage;
