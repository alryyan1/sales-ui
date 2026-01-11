// src/components/admin/users/NavigationPermissionsSection.tsx
import React, { useState, useMemo } from "react";
import { CheckSquare, Square, ChevronDown, ChevronUp, Info } from "lucide-react";
import { navItems } from "@/components/layouts/navItems";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface NavigationItem {
  route: string;
  label: string;
}

interface NavigationCategory {
  category: string;
  items: NavigationItem[];
}

interface NavigationPermissionsSectionProps {
  value: string[];
  onChange: (routes: string[]) => void;
  isSuperadmin?: boolean;
}

const NavigationPermissionsSection: React.FC<NavigationPermissionsSectionProps> = ({
  value,
  onChange,
  isSuperadmin = false,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // Fetch navigation items from API (or use local navItems as fallback)
  const { data: apiNavItems } = useQuery<{ data: NavigationCategory[] }>({
    queryKey: ["navigation-items"],
    queryFn: async () => {
      try {
        const response = await apiClient.get("/admin/navigation-items");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch navigation items:", error);
        return { data: [] };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Build navigation structure from navItems.ts
  const buildNavStructure = (): NavigationCategory[] => {
    const categories: Record<string, NavigationItem[]> = {};

    navItems.forEach((item) => {
      const category = item.category || "غير مصنف";

      // Add parent item if it has a route (not just a parent)
      if (item.to !== "#" && item.to) {
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push({
          route: item.to,
          label: item.label,
        });
      }

      // Add children
      if (item.children) {
        item.children.forEach((child) => {
          if (!categories[category]) {
            categories[category] = [];
          }
          categories[category].push({
            route: child.to,
            label: child.label,
          });
        });
      }
    });

    return Object.entries(categories).map(([category, items]) => ({
      category,
      items,
    }));
  };

  // Use API data if available, otherwise use local structure
  const navigationStructure = useMemo(() => {
    if (apiNavItems?.data && apiNavItems.data.length > 0) {
      return apiNavItems.data;
    }
    return buildNavStructure();
  }, [apiNavItems]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Get all routes from navigation structure
  const allRoutes = useMemo(() => {
    return navigationStructure.flatMap((cat) =>
      cat.items.map((item) => item.route)
    );
  }, [navigationStructure]);

  // Check if all routes in a category are selected
  const isCategoryFullySelected = (category: NavigationCategory): boolean => {
    return category.items.every((item) => value.includes(item.route));
  };

  // Check if some routes in a category are selected
  const isCategoryPartiallySelected = (
    category: NavigationCategory
  ): boolean => {
    return (
      category.items.some((item) => value.includes(item.route)) &&
      !isCategoryFullySelected(category)
    );
  };

  // Toggle all routes in a category
  const toggleCategorySelection = (category: NavigationCategory) => {
    const categoryRoutes = category.items.map((item) => item.route);
    const allSelected = isCategoryFullySelected(category);

    if (allSelected) {
      // Deselect all routes in this category
      onChange(value.filter((route) => !categoryRoutes.includes(route)));
    } else {
      // Select all routes in this category
      const newRoutes = [
        ...value.filter((route) => !categoryRoutes.includes(route)),
        ...categoryRoutes,
      ];
      onChange(newRoutes);
    }
  };

  // Toggle all routes globally
  const toggleAllSelection = () => {
    if (value.length === allRoutes.length) {
      onChange([]);
    } else {
      onChange([...allRoutes]);
    }
  };

  // Check if all routes are selected
  const isAllSelected =
    value.length === allRoutes.length && allRoutes.length > 0;
  const isSomeSelected =
    value.length > 0 && value.length < allRoutes.length;

  if (isSuperadmin) {
    return (
      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription>
          المستخدم لديه صلاحية الوصول الكاملة لجميع صفحات النظام (Superadmin)
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">صلاحيات الوصول للصفحات</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleAllSelection}
          className="h-8"
        >
          {isAllSelected ? (
            <>
              <CheckSquare className="mr-2 h-4 w-4" />
              إلغاء تحديد الكل
            </>
          ) : (
            <>
              <Square className="mr-2 h-4 w-4" />
              تحديد الكل
            </>
          )}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        اختر الصفحات التي يمكن للمستخدم الوصول إليها. سيتم إخفاء الصفحات غير
        المحددة من القائمة الجانبية.
      </p>

      <Separator />

      <div className="space-y-2">
        {navigationStructure.map((category) => {
          const isExpanded = expandedCategories.has(category.category);
          const isFullySelected = isCategoryFullySelected(category);
          const isPartiallySelected = isCategoryPartiallySelected(category);

          return (
            <Collapsible
              key={category.category}
              open={isExpanded}
              onOpenChange={() => toggleCategory(category.category)}
            >
              <div className="flex items-center justify-between rounded-md p-2 hover:bg-accent transition-colors">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`category-${category.category}`}
                    checked={isFullySelected}
                    onCheckedChange={(checked) => {
                      toggleCategorySelection(category);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      isPartiallySelected && "data-[state=checked]:bg-primary/50"
                    )}
                  />
                  <Label
                    htmlFor={`category-${category.category}`}
                    className="cursor-pointer font-semibold text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {category.category}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    ({category.items.length} صفحة)
                  </span>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent className="pr-8 pt-2 space-y-2">
                {category.items.map((item) => {
                  const isChecked = value.includes(item.route);
                  return (
                    <div
                      key={item.route}
                      className="flex items-start space-x-2 space-x-reverse"
                    >
                      <Checkbox
                        id={`nav-${item.route}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onChange([...value, item.route]);
                          } else {
                            onChange(value.filter((r) => r !== item.route));
                          }
                        }}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor={`nav-${item.route}`}
                        className="cursor-pointer flex-1"
                      >
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {item.route}
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {value.length > 0 && (
        <div className="pt-2">
          <p className="text-xs text-muted-foreground">
            تم تحديد {value.length} من {allRoutes.length} صفحة
          </p>
        </div>
      )}
    </div>
  );
};

export default NavigationPermissionsSection;
